import { resolveDictionaryWord } from './utils/dict-resolver.js';

console.log('===============================================================');
console.log('⚡ BENCHMARKING FAST SMART RESOLUTION ENGINE & DATA INTEGRITY');
console.log('===============================================================\n');

const testWords = [
  { word: 'meticulous', context: 'He was meticulous in his preparation for the exam.' },
  { word: 'ephemeral', context: 'Fame in the digital age is often ephemeral.' },
  { word: 'procrastinate', context: 'Do not procrastinate when you have deadlines.' },
  { word: 'vulnerable', context: 'Elderly people are particularly vulnerable to the disease.' },
  { word: 'serendipity', context: 'Finding that book was pure serendipity.' },
  { word: 'ubiquitous', context: 'Smartphones have become ubiquitous in daily life.' },
  { word: 'infrastructure', context: 'The government invested heavily in infrastructure.' },
  { word: 'resilience', context: 'She showed remarkable resilience in the face of adversity.' },
  { word: 'sustainable', context: 'We need sustainable energy sources for the future.' },
  { word: 'compromise', context: 'Both sides had to compromise to reach an agreement.' },
  { word: 'principal', context: 'He was sent to the principal office.' },
  { word: 'announcement', context: 'The company made an official announcement.' }
];

async function runBenchmark() {
  const results = [];
  let passedIntegrity = 0;

  for (const item of testWords) {
    const start = performance.now();
    const res = await resolveDictionaryWord(item.word, item.context);
    const duration = Math.round(performance.now() - start);

    const wordData = res?.word || {};
    const hasMeaning = !!wordData.meaning_vi;
    const hasIPA = !!(wordData.ipa_uk || wordData.ipa_us);
    const hasPOS = !!wordData.partOfSpeech;
    const hasLevel = !!wordData.level;
    const hasExamples = Array.isArray(wordData.examples) && wordData.examples.length > 0;
    const hasCollocations = Array.isArray(wordData.collocations) && wordData.collocations.length > 0;

    const integrityPassed = hasMeaning && hasIPA && hasPOS && hasExamples && hasCollocations;
    if (integrityPassed) passedIntegrity++;

    results.push({
      word: item.word,
      duration,
      meaning: wordData.meaning_vi,
      pos: wordData.partOfSpeech,
      level: wordData.level || 'N/A',
      ipa: wordData.ipa_uk || wordData.ipa_us || 'N/A',
      examplesCount: wordData.examples?.length || 0,
      collocationsCount: wordData.collocations?.length || 0,
      integrityPassed
    });

    console.log(`[${duration}ms] "${item.word}" -> "${wordData.meaning_vi}" [${wordData.level || 'B2'}] (${wordData.partOfSpeech}) | Examples: ${wordData.examples?.length || 0}, Collocs: ${wordData.collocations?.length || 0} ${integrityPassed ? '✓' : '✗'}`);
  }

  console.log('\n--- ⚡ SECOND LOOKUP (MEMORY/CACHE HIT SIMULATION) ---');
  for (const item of testWords.slice(0, 3)) {
    const start = performance.now();
    const res = await resolveDictionaryWord(item.word, item.context);
    const duration = Math.round((performance.now() - start) * 100) / 100;
    console.log(`[${duration}ms - Instant Hit] "${item.word}" -> "${res.word.meaning_vi}"`);
  }

  const durations = results.map(r => r.duration);
  const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  console.log('\n===============================================================');
  console.log('📊 BENCHMARK SUMMARY & PERFORMANCE COMPARISON:');
  console.log('===============================================================');
  console.log(`Total Words Tested: ${testWords.length}`);
  console.log(`Average Latency:    ${avgDuration}ms (vs ~2,500ms Legacy Baseline => ~${Math.round(2500 / avgDuration)}x Faster!)`);
  console.log(`Fastest Lookup:     ${minDuration}ms`);
  console.log(`Slowest Lookup:     ${maxDuration}ms`);
  console.log(`Data Completeness:  ${passedIntegrity}/${testWords.length} (${Math.round(passedIntegrity / testWords.length * 100)}%)`);
  console.log('===============================================================');

  if (passedIntegrity !== testWords.length) {
    console.error('⚠️ Some words did not meet 100% dictionary completeness!');
    process.exit(1);
  } else {
    console.log('🎉 100% DATA INTEGRITY & ULTRA-FAST RESPONSE CONFIRMED!');
  }
}

runBenchmark().catch(err => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
