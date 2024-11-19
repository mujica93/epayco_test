import { Request, Response } from "express";
import crypto from 'crypto';
import pool from "../../database";
import { sendEmail } from "../../mailer"
import { ResponseModel } from "../models/response";

const payController: any = {}; 

payController.recharge = async (req: Request, res: Response) => {

    const responseJson : ResponseModel = new ResponseModel();
    
    const { dni,phone ,amount } = req.body;

    const validate = validateRecharge(req);
    
    if (!validate.success) {
        return res.status(400).json(validate);
    }

    //validar que la wallet exista y pertenezca al usuario

    const validWallet = await validateWallet(dni, phone);

    if (!validWallet) {
        responseJson.cod_error = 404;
        responseJson.success = false;
        responseJson.message_error = 'Wallet not found';
        return res.status(404).json(responseJson);
    }

    try {
        //recargar saldo en la billetera
        const connection = await pool.getConnection();
        const [user]: any = await connection.query('SELECT id FROM users WHERE dni = ?', [dni]);
        const userId = user[0].id;
        await connection.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, userId]);
        connection.release();
        responseJson.cod_error = 200;
        responseJson.success = true;
        responseJson.message_error = 'Balance recharged successfully';
        return res.status(200).json(responseJson);
    } catch (error) {
        console.log('Error recharging balance', error);
        responseJson.cod_error = 500;
        responseJson.success = false;
        responseJson.message_error = 'Error recharging balance';
        return res.status(500).json(responseJson);
    }

};

payController.balance = async (req: Request, res: Response) => {
    
    const responseJson : ResponseModel = new ResponseModel();
    
    const { dni, phone }: any = req.query;

    const validate = validateBalance(req);

    if (!validate.success) {
        return res.status(400).json(validate);
    }
    //validar que la wallet exista y pertenezca al usuario, y convertimos dni y phone a string
    const validWallet = await validateWallet(dni.toString(), phone.toString());

    if (!validWallet) {
        responseJson.cod_error = 404;
        responseJson.success = false;
        responseJson.message_error = 'Wallet not found';
        return res.status(404).json(responseJson);
    }

    try {
        //consultar saldo
        const connection = await pool.getConnection();
        const [user]: any = await connection.query('SELECT w.balance FROM wallets w INNER JOIN users u ON w.user_id = u.id WHERE u.dni = ? AND u.phone = ?', [dni, phone]);
        connection.release();
        if (user.length === 0) {
            responseJson.cod_error = 404;
            responseJson.success = false;
            responseJson.message_error = 'User not found';
            return res.status(404).json(responseJson);
        }
        responseJson.cod_error = 200;
        responseJson.success = true;
        responseJson.data = user[0];
        return res.status(200).json(responseJson);
    } catch (error) {
        console.log('Error getting balance', error);
        responseJson.cod_error = 500;
        responseJson.success = false;
        responseJson.message_error = 'Error getting balance';
        return res.status(500).json(responseJson);
    }
};   

payController.payment = async (req: Request, res: Response) => {

    const responseJson: ResponseModel = new ResponseModel();

    const { dni, phone, amount } = req.body;

    const validate = validateRecharge(req);

    if (!validate.success) {
        return res.status(400).json(validate);
    }

    try {

        const connection = await pool.getConnection();
        const [user]: any = await connection.query('SELECT id, email FROM users WHERE dni = ? AND phone = ?', [dni, phone]);

        if (user.length === 0) {
            connection.release();
            responseJson.cod_error = 404;
            responseJson.success = false;
            responseJson.message_error = 'User not found';
            responseJson.data = null;
            return res.status(404).json(responseJson);
        }

        const userId = user[0].id;
        const email = user[0].email;

        const [wallet]: any = await connection.query('SELECT balance FROM wallets WHERE user_id = ?', [userId]);

        if (wallet.length === 0 || wallet[0].balance < amount) {
            connection.release();
            responseJson.cod_error = 400;
            responseJson.success = false;
            responseJson.message_error = 'Insufficient balance';
            responseJson.data = { balance: wallet[0].balance };
            return res.status(400).json(responseJson);
        }

        const token = crypto.randomBytes(3).toString('hex');
        const sessionId = crypto.randomBytes(16).toString('hex');
        
        await connection.query('INSERT INTO sessions (session_id, user_id, token, amount) VALUES (?, ?, ?, ?)', [sessionId, userId, token, amount]);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Token de confirmación de pago',
            text: `Su token de confirmación es: ${token}`
        };

        await sendEmail(mailOptions);
    
        connection.release();
        responseJson.cod_error = 200;
        responseJson.success = true;
        responseJson.message_error = 'Email sent with confirmation token';
        responseJson.data = { sessionId };
        return res.status(200).json(responseJson);

    } catch (error) {

        console.log('Error al generar el token de pago', error);
        responseJson.cod_error = 500;
        responseJson.success = false;
        responseJson.message_error = 'Errot to generate payment token';
        responseJson.data = null;
        return res.status(500).json(responseJson);

    }
};

payController.confirmPayment = async (req: Request, res: Response) => {

    const responseJson: ResponseModel = new ResponseModel();
    const { sessionId, token } = req.body;

    if (!sessionId || !token) {
        responseJson.cod_error = 400;
        responseJson.success = false;
        responseJson.message_error = 'sessionId and token are required';
        responseJson.data = null;
        return res.status(400).json(responseJson);
    }

    try {
        const connection = await pool.getConnection();
        const [session]: any = await connection.query('SELECT user_id, amount FROM sessions WHERE session_id = ? AND token = ?', [sessionId, token]);
        if (session.length === 0) {
            connection.release();
            responseJson.cod_error = 400;
            responseJson.success = false;
            responseJson.message_error = 'Invalid session or token';
            responseJson.data = null;
            return res.status(400).json(responseJson);
        }

        const userId = session[0].user_id;
        const amount = session[0].amount;

        await connection.query('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [amount, userId]);
        // await connection.query('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
        const wallet: any = await connection.query('SELECT balance FROM wallets WHERE user_id = ?', [userId]);

        connection.release();
        responseJson.cod_error = 200;
        responseJson.success = true;
        responseJson.message_error = 'Payment confirmed successfully';
        responseJson.data = { balance: wallet[0].balance };
        return res.status(200).json(responseJson);
    } catch (error) {
        console.log('Error al confirmar el pago', error);
        responseJson.cod_error = 500;
        responseJson.success = false;
        responseJson.message_error = 'Error confirming payment';
        responseJson.data = null;
        return res.status(500).json(responseJson);
    }
};

function validateRecharge(req: Request) {
    
    const responseJson : ResponseModel = new ResponseModel();
    responseJson.cod_error = 400;
    responseJson.success = true;
    responseJson.data = null;

    if (!req.body.dni) {
        responseJson.message_error = 'dni is required';
        responseJson.success = false;
    }

    if (!req.body.phone) {
        responseJson.message_error = 'phone is required';
        responseJson.success = false;
    }

    if (!req.body.amount) {
        responseJson.message_error = 'amount is required';
        responseJson.success = false;
    }

    return responseJson;
}

function validateBalance(req: Request) {
        
    const responseJson : ResponseModel = new ResponseModel();
    responseJson.cod_error = 400;
    responseJson.success = true;
    responseJson.data = null;

    if (!req.query.dni) {
        responseJson.message_error = 'dni is required';
        responseJson.success = false;
    }

    if (!req.query.phone) {
        responseJson.message_error = 'phone is required';
        responseJson.success = false;
    }

    return responseJson;
};

async function validateWallet(dni: string, phone: string) {
    const connection = await pool.getConnection();
    const [user]: any = await connection.query('SELECT w.balance FROM wallets w INNER JOIN users u ON w.user_id = u.id WHERE u.dni = ? AND u.phone = ?', [dni, phone]);
    connection.release();
    
    if (user.length === 0) {
        return false;
    }

    return true;
}

export default payController