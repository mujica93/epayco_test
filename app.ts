import Express from "express";
import cors from "cors";
import authRoutes from './src/routes/auth.route';
import payRoutes from './src/routes/pay.route';

const port = process.env.PORT || 3000;

export class App {
    app: Express.Application;

    constructor() {
        this.app = Express();
        this.app.use(Express.json());
        this.app.use(Express.urlencoded({ extended: true }));
        this.middlewares();
        this.routes();
    }

    middlewares() {
        this.app.use(Express.json({ limit: '512mb' }));
        this.app.use(Express.urlencoded({ limit: '512mb', extended: true }));
        this.app.use(cors());
    }

    routes() {
        this.app.use('/auth',authRoutes);
        this.app.use('/pay',payRoutes);
    }

    start() {
        this.app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    }
}