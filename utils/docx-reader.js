// d:/extension/utils/docx-reader.js
// Zero-dependency pure browser/ES-module DOCX text extractor
// Parses PKZIP Central Directory + inflates word/document.xml using DecompressionStream (Safari 16.4+, Chrome, Node fallback)

function decodeXmlEntities(str) {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

async function inflateRawBytes(compressedBytes) {
  if (typeof DecompressionStream !== 'undefined') {
    const stream = new Blob([compressedBytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const ab = await new Response(stream).arrayBuffer();
    return new Uint8Array(ab);
  }
  // Node.js fallback for automated verification
  if (typeof process !== 'undefined' && process.versions?.node) {
    const zlib = await import('node:zlib');
    return new Uint8Array(zlib.inflateRawSync(compressedBytes));
  }
  throw new Error('Trình duyệt hiện tại chưa hỗ trợ DecompressionStream để giải nén .docx.');
}

/**
 * Extracts a single named entry from a ZIP ArrayBuffer / Uint8Array using Central Directory headers.
 */
export async function extractZipEntry(bufferOrBytes, targetName) {
  const bytes = bufferOrBytes instanceof Uint8Array ? bufferOrBytes : new Uint8Array(bufferOrBytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Locate End of Central Directory record (0x06054b50) scanning backwards (max comment 64KB + 22B)
  const minOffset = Math.max(0, bytes.length - 65558);
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('File không đúng định dạng ZIP/DOCX hợp lệ.');
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  let ptr = cdOffset;
  const decoder = new TextDecoder('utf-8');

  for (let idx = 0; idx < totalEntries; idx++) {
    if (ptr + 46 > bytes.length || view.getUint32(ptr, true) !== 0x02014b50) {
      break;
    }
    const method = view.getUint16(ptr + 10, true);
    const compSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localOffset = view.getUint32(ptr + 42, true);

    const entryName = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
    ptr += 46 + nameLen + extraLen + commentLen;

    if (entryName !== targetName) continue;

    if (view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new Error('Lỗi cấu trúc Local Header trong file DOCX.');
    }
    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const rawChunk = bytes.subarray(dataStart, dataStart + compSize);

    if (method === 0) {
      return rawChunk;
    }
    if (method === 8) {
      return await inflateRawBytes(rawChunk);
    }
    throw new Error(`Phương thức nén ZIP (${method}) không được hỗ trợ.`);
  }

  return null;
}

/**
 * Extracts clean readable plain text with preserved paragraphs from a .docx binary buffer.
 */
export async function extractDocxText(bufferOrBytes) {
  const xmlBytes = await extractZipEntry(bufferOrBytes, 'word/document.xml');
  if (!xmlBytes) {
    throw new Error('Không tìm thấy nội dung word/document.xml bên trong file DOCX.');
  }

  const xml = new TextDecoder('utf-8').decode(xmlBytes);
  const paragraphs = [];
  const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/gi;
  let pm;

  while ((pm = pRegex.exec(xml)) !== null) {
    const inner = pm[1]
      .replace(/<w:pPr\b[^>]*>[\s\S]*?<\/w:pPr>/gi, '')
      .replace(/<w:tab\b[^>]*\/?>/gi, '<w:t> </w:t>')
      .replace(/<w:(?:br|cr)\b[^>]*\/?>/gi, '<w:t>\n</w:t>');

    let paraText = '';
    const tRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi;
    let tm;
    while ((tm = tRegex.exec(inner)) !== null) {
      paraText += decodeXmlEntities(tm[1]);
    }
    const cleaned = paraText.replace(/[ \t]+/g, ' ').trim();
    if (cleaned) paragraphs.push(cleaned);
  }

  return paragraphs.join('\n\n');
}
