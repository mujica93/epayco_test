import { App } from './app';
import { getConnectionDB } from './database';
//initialize the app, DB connection and start the server
async function main() {
    //app
    const app = new App();
    //DB 
    getConnectionDB();
    //start server
    app.start();
}

main();