#!/usr/bin/env node

/**
 * CYRUS Voice System Test Script
 * Tests the enhanced ElevenLabs integration with emotion-based voice synthesis
 */

import { textToSpeechWithEmotion, analyzeTextForEmotion, getEmotionVoiceSettings } from './client.js';

async function testVoiceSystem() {
  console.log('🎭 Testing CYRUS Voice System...\n');

  // Test emotion analysis
  console.log('🧠 Testing Emotion Analysis:');
  const testTexts = [
    "I'm so happy to help you today!",
    "I'm sorry that happened to you.",
    "Let me analyze this problem for you.",
    "I understand how you feel.",
    "Let's create something amazing together!",
    "This is a normal conversation."
  ];

  for (const text of testTexts) {
    const emotion = analyzeTextForEmotion(text);
    const settings = getEmotionVoiceSettings(emotion);
    console.log(`  "${text}" → ${emotion} (stability: ${settings.stability}, style: ${settings.style})`);
  }

  console.log('\n🎵 Testing Voice Synthesis:');

  // Test voice synthesis with different emotions
  const testEmotions = ['happy', 'empathetic', 'analytical', 'creative', 'conversational'];

  for (const emotion of testEmotions) {
    try {
      const testText = `This is a test of the ${emotion} voice setting.`;
      console.log(`  Generating audio for emotion: ${emotion}`);

      const audioBuffer = await textToSpeechWithEmotion(testText, 'rachel', emotion);
      console.log(`  ✓ Generated ${audioBuffer.length} bytes of audio for ${emotion}`);

    } catch (error) {
      console.error(`  ✗ Failed to generate audio for ${emotion}:`, error.message);
    }
  }

  console.log('\n✅ Voice system test completed!');
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testVoiceSystem().catch(console.error);
}

export { testVoiceSystem };