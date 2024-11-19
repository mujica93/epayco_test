import { Request, Response } from "express";
import crypto from 'crypto';
import pool from "../../database";
import { ResponseModel } from "../models/response";

const authController: any = {};

authController.register = async (req: Request, res: Response) => {

    const responseJson : ResponseModel = new ResponseModel();
    
    const { dni, name, surname, email, phone } = req.body;

    const validate = validateRegister(req);
    
    if (!validate.success) {
        return res.status(400).json(validate);
    }

    try {
        //guardar en la db el usuario
        const connection = await pool.getConnection();
        const sessionId = crypto.randomBytes(16).toString('hex');
        const [result]: any = await connection.query('INSERT INTO users (dni, name, surname, email, phone, session_id) VALUES (?, ?, ?, ?, ?)', [dni, name, surname, email, phone, sessionId]);
        const userId = result.insertId;
        await connection.query('INSERT INTO wallets (user_id) VALUES (?)', [userId]);
        connection.release();
        responseJson.cod_error = 200;
        responseJson.success = true;
        responseJson.message_error = 'User registered successfully';
        //enviamos los datos del usuario
        responseJson.data = {
            dni,
            name,
            surname,
            email,
            phone,
            session_id: sessionId
        };
        return res.status(200).json(responseJson);
    } catch (error) {
        console.log('Error registering user', error);
        responseJson.cod_error = 500;
        responseJson.success = false;
        responseJson.message_error = 'Error registering user';
        responseJson.data = null;
        return res.status(500).json(responseJson);
    }

};

authController.hello = async (req: Request, res: Response) => {
    const responseJson : ResponseModel = new ResponseModel();
    responseJson.cod_error = 200;
    responseJson.success = true;
    responseJson.message_error = 'Hello World';
    return res.status(200).json(responseJson);
    //return res.status(200).json({message: 'Hello World'});
};

function validateRegister(req: Request) {

    const responseJson : ResponseModel = new ResponseModel();
    responseJson.cod_error = 400;
    responseJson.success = true;
    responseJson.data = null;

    if (!req.body.dni) {
        responseJson.message_error = 'dni is required';
        responseJson.success = false;
    }

    if (!req.body.name) {
        responseJson.message_error = 'name is required';
        responseJson.success = false;
    }

    if (!req.body.surname) {
        responseJson.message_error = 'surname is required';
        responseJson.success = false;
    }

    if (!req.body.email) {
        responseJson.message_error = 'email is required';
        responseJson.success = false;
    }
    
    if (!req.body.phone) {
        responseJson.message_error = 'phone is required';
        responseJson.success = false;
    }

    return responseJson;
}

export default authController