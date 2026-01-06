module.exports = {
    apps: [
        {
            name: 'zena-backend-dev',
            cwd: './packages/backend',
            script: 'npm',
            args: 'run dev',
            env: {
                NODE_ENV: 'development',
                PORT: 3001
            },
            autorestart: true,
            watch: false
        },
        {
            name: 'zena-frontend-dev',
            cwd: './packages/frontend',
            script: 'npm',
            args: 'run dev',
            env: {
                NODE_ENV: 'development'
            },
            autorestart: true,
            watch: false
        }
    ]
};
