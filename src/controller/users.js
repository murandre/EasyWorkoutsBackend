import { connect } from "../databases";
import jwt from "jsonwebtoken";
import fs from 'fs';
import path from 'path';
const secreto = process.env.SECRET_KEY;

export const logIn = async (req, res) => {
  try {
    const { email, password } = req.body;
    const cnn = await connect();

    const q = "SELECT password FROM users WHERE email=?";
    const parametros = [email];
    const [row] = await cnn.query(q, parametros);

    if (row.length === 0) {
      return res.status(400).json({ success: false, message: "Usuario no existe" });
    }

    if (password === row[0].password) {
      const token = getToken({ sub: email });
      return res.status(200).json({ success: true, message: "Todo ok", token });
    } else {
      return res.status(401).json({ success: false, message: "Contraseña incorrecta" });
    }
  } catch (error) {
    console.log("Error de login:", error.message);
    return res.status(500).json({ message: "Error" });
  }
};

export const createUsers = async (req, res) => {
  try {
    const cnn = await connect();
    const { username, email, password } = req.body;

    const emailExists = await checkUserExists(cnn, "users", "email", email);
    if (emailExists) {
      return res.json({ message: "Ya hay una cuenta con esta dirección de email", success: false });
    }

    const [row] = await cnn.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, password]
    );

    if (row.affectedRows === 1) {
      return res.json({ message: "Usuario creado con éxito", success: true });
    } else {
      return res.status(500).json({ message: "No se pudo crear el usuario" });
    }
  } catch (error) {
    console.log("Error en createUsers:", error.message);
    res.status(500).json({ message: "Error al crear usuario", success: false });
  }
};

export const createRoutine = async (req, res) => {
  try {
    const cnn = await connect();
    const { nombre, duracion, foto } = req.body;
    const email = req.email;

    const [row] = await cnn.query(
      "INSERT INTO rutina (nombre, duracion, foto, creador_email) VALUES (?, ?, ?, ?)",
      [nombre, duracion, foto, email]
    );

    if (row.affectedRows === 1) {
      return res.json({
        message: "Rutina creada con éxito",
        success: true,
        rutinaId: row.insertId,
      });
    } else {
      return res.status(500).json({ message: "No se pudo crear la rutina" });
    }
  } catch (error) {
    console.log("Error en createRoutine:", error.message);
    res.status(500).json({ message: "Error al crear la rutina", success: false });
  }
};

export const updateUserDetails = async (req, res) => {
  try {
    const cnn = await connect();
    const email = req.email;

    const [user] = await cnn.query("SELECT * FROM users WHERE email = ?", [email]);
    if (user.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado", success: false });
    }

    const { newEmail, newPassword, newUsername } = req.body;

    if (newEmail) {
      const [emailCheck] = await cnn.query("SELECT * FROM users WHERE email = ?", [newEmail]);
      if (emailCheck.length > 0) {
        return res.status(400).json({ message: "El email ya está en uso por otro usuario", success: false });
      }
    }

    const updateFields = {};
    if (newEmail) updateFields.email = newEmail;
    if (newPassword) updateFields.password = newPassword;
    if (newUsername) updateFields.username = newUsername;

    const fields = Object.keys(updateFields);
    const values = Object.values(updateFields);

    if (fields.length > 0) {
      const setClause = fields.map((field) => `${field} = ?`).join(", ");
      values.push(email);

      const query = `UPDATE users SET ${setClause} WHERE email = ?`;
      const [result] = await cnn.query(query, values);

      if (result.affectedRows === 1) {
        return res.json({ message: "Usuario actualizado con éxito", success: true });
      } else {
        return res.status(500).json({ message: "No se pudo actualizar el usuario", success: false });
      }
    } else {
      return res.status(400).json({ message: "No se proporcionaron campos para actualizar", success: false });
    }
  } catch (error) {
    console.log("Error en updateUserDetails:", error.message);
    res.status(500).json({ message: "Error al actualizar el usuario", success: false });
  }
};

const checkUserExists = async (cnn, table, attribute, value) => {
  try {
    const [row] = await cnn.query(`SELECT * FROM ${table} WHERE ${attribute}=?`, [value]);
    return row.length > 0;
  } catch (error) {
    console.error("Error en checkUserExists:", error.message);
    return false;
  }
};

const getToken = (payload) => {
  try {
    return jwt.sign(payload, secreto, { expiresIn: "180d" });
  } catch (error) {
    console.log("Error al generar token:", error.message);
    return error;
  }
};
