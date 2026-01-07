import { execSync, spawn } from 'child_process';
import http from 'http';

const BACKEND_PORT = 3001;
const FRONTEND_PORT = 5173;

function checkPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = http.createServer();
        server.once('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true); // Port in use
            } else {
                resolve(false);
            }
        });
        server.once('listening', () => {
            server.close();
            resolve(false); // Port free
        });
        server.listen(port);
    });
}

async function verifyInvariants() {
    console.log('--- Verifying Environment Invariants ---');

    // 1. Initial State: Ports should be free (after clean)
    console.log('Step 1: Running clean script...');
    execSync('npm run clean', { stdio: 'inherit' });

    const backInUse = await checkPort(BACKEND_PORT);
    const frontInUse = await checkPort(FRONTEND_PORT);

    if (backInUse || frontInUse) {
        throw new Error(`CRITICAL: Ports not cleared after clean. Backend: ${backInUse}, Frontend: ${frontInUse}`);
    }
    console.log('✅ Invariant 1: Ports are free after cleanup.');

    // 2. Start Dev: Both ports should become occupied
    console.log('Step 2: Starting dev environment (timed 60s)...');
    // Using shell: true and stdio: inherit to see output and handle process groups better
    const devProcess = spawn('npm run dev', { stdio: 'inherit', shell: true, detached: true });

    // Wait for startup (up to 60s)
    let ready = false;
    for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 500));
        const b = await checkPort(BACKEND_PORT);
        const f = await checkPort(FRONTEND_PORT);
        if (i % 20 === 0) console.log(`[Diagnostic] Waiting for servers... Backend: ${b}, Frontend: ${f}`);
        if (b && f) {
            ready = true;
            break;
        }
    }

    if (!ready) {
        const b = await checkPort(BACKEND_PORT);
        const f = await checkPort(FRONTEND_PORT);
        console.error(`[Diagnostic] Final check - Backend: ${b}, Frontend: ${f}`);
        try { process.kill(-devProcess.pid!); } catch (e) { }
        throw new Error('CRITICAL: Servers failed to start within 60s');
    }
    console.log('✅ Invariant 2: Both servers started successfully.');

    // 3. Clean Shutdown: Both ports should be clear after killing the parent
    console.log('Step 3: Simulating stop signal (SIGTERM to process group)...');
    try { process.kill(-devProcess.pid!, 'SIGTERM'); } catch (e) { }

    // Wait for shutdown
    let cleared = false;
    for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 500));
        const b = await checkPort(BACKEND_PORT);
        const f = await checkPort(FRONTEND_PORT);
        if (i % 10 === 0) console.log(`[Diagnostic] Waiting for clearing... Backend: ${b}, Frontend: ${f}`);
        if (!b && !f) {
            cleared = true;
            break;
        }
    }

    if (!cleared) {
        // Force clean if invariant failed
        console.error('Shutdown failed to clear ports. Running emergency clean...');
        execSync('npm run clean');
        throw new Error('CRITICAL: Shutdown did not clear ports automatically. Orphaned processes detected.');
    }
    console.log('✅ Invariant 3: Shutdown cleared all ports synchronously.');

    console.log('--- ALL STABILITY INVARIANTS PASSED ---');
}

verifyInvariants().catch(err => {
    console.error(`\nFAILED: ${err.message}`);
    process.exit(1);
});
