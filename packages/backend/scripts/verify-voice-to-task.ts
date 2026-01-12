import { voiceNoteService } from '../src/services/voice-note.service.js';
import prisma from '../src/config/database.js';

async function verifyVoiceToTask() {
    console.log('--- Verifying Voice Note to Task Flow ---');

    // 1. Use an existing user
    const userId = 'stress-test-agent-001';

    // 2. Create a mock voice note with a 'placeholder' URL
    const audioUrl = 'https://example.com/audio-placeholder.mp3';
    console.log(`Creating mock voice note for ${userId}...`);
    const voiceNoteId = await voiceNoteService.createVoiceNote(userId, audioUrl);

    // 3. Process the voice note
    console.log(`Processing voice note ${voiceNoteId}...`);
    const result = await voiceNoteService.processVoiceNote(voiceNoteId);

    console.log('Transcription:', result.transcript);
    console.log('Extracted Entities:', JSON.stringify(result.extractedEntities, null, 2));
    console.log('Created Tasks:', result.createdTasks);

    // 4. Verify in DB
    const tasks = await prisma.task.findMany({
        where: { id: { in: result.createdTasks } }
    });

    console.log(`Verified ${tasks.length} tasks in database.`);
    tasks.forEach(task => {
        console.log(`- [${task.status}] ${task.label} (Source: ${task.source}, Due: ${task.dueDate})`);
    });

    if (tasks.length > 0) {
        console.log('\n✅ SUCCESS: Voice note bridge to tasks is working!');
    } else {
        console.log('\n❌ FAILURE: No tasks were created.');
    }
}

verifyVoiceToTask().catch(console.error).finally(() => process.exit());
