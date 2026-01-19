
import { toolRegistry } from './packages/backend/dist/tools/registry.js';
import { toolAliasGenerator } from './packages/backend/dist/tools/tool-alias-generator.js';
import './packages/backend/dist/tools/index.js';

async function debugRegistry() {
    console.log('--- TOOL REGISTRY DUMP ---');
    const tools = toolRegistry.getAllTools();
    console.log(`Total tools: ${tools.length}`);

    const calendarTools = tools.filter(t => t.domain === 'calendar');
    console.log(`Calendar tools: ${calendarTools.length}`);
    calendarTools.forEach(t => console.log(` - ${t.name} (domain: ${t.domain})`));

    console.log('\n--- ALIAS RESOLUTION TEST ---');
    const tests = ['calendar.create', 'calendar.create_event', 'book_appointment', 'create_contact'];
    tests.forEach(name => {
        const resolved = toolAliasGenerator.resolve(name);
        console.log(` - ${name} -> ${resolved}`);
    });
}

debugRegistry().catch(console.error);
