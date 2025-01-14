const inquirer = require('inquirer');
const { StartServer, StopServer, showActiveServers } = require('./serverFunctions'); // Import your functions

// Simple CLI for testing
async function mainMenu() {
    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Select an action',
            choices: [
                { name: 'Launch Server', value: 'launch' },
                { name: 'Stop Server', value: 'stop' },
                { name: 'Show Active Servers', value: 'show' },
                { name: 'Exit', value: 'exit' }
            ]
        }
    ]);

    switch (answers.action) {
        case 'launch':
            StartServer();
            break;
        case 'stop':
            StopServer();
            break;
        case 'show':
            showActiveServers();
            break;
        case 'exit':
            console.log('Exiting...');
            process.exit();
            break;
    }

    // Re-run the menu after action
    mainMenu();
}

mainMenu();
