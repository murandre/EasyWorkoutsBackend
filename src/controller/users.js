import { connect } from "../databases";
import jwt from "jsonwebtoken";
import fs from 'fs';
import path from 'path';
const secreto = process.env.SECRET_KEY;

export const logIn = async (req, res) => {
  try {
    const { dni, password } = req.body;
    //cadena de conexión a la base de datos
    const cnn = await connect();

    const q = "SELECT password FROM users WHERE dni=?"
    const parametros = [dni]

    const [row] = await cnn.query(q, parametros);

    console.log("resultado de la consulta de datos", row);

    //si no existe el dni el row viene vacío == 0 
    if (row.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "usuario no existe " })
    }

    //comprobar el row viene vacío
    if (password === row[0].password) {
      //éxito en el login 
      const token = getToken({ sub: dni });
      return res
        .status(200) 
        .json({ success: true, message: "todo ok", token: token })
    } else {
      //no coincide
      return res.status(401).json({ success: false })
    }
  } catch (error) {
    console.log("Error de login", error.message);
    return res.status(500).json({ message: "error" });
  }
};

const checkUserExists = async (cnn, table, attribute, value) => {
  try {
    const [row] = await cnn.query(`SELECT * FROM ${table} WHERE ${attribute}=?`, [value]);
    console.log(row);
    return row.length > 0;
  } catch (error) {
    console.error(error, "checkUserExists");
    return false;
  }
}

//crear usuarios desde el signup
export const createUsers = async (req, res) => {
  try {
    //establecer la conexión
    const cnn = await connect();
    //desestructurar el cuerpo de mi petición HTTP
    const { dni, username,  email, password } = req.body;

    //validar con mi función
    const dniExists = await checkUserExists(cnn, "users", "dni", dni);
    const emailExists = await checkUserExists(cnn, "users", "email", email);

    if (dniExists || emailExists) {
      //existe el usuario
      return res.json({ message: "ya existe el dni o el correo",success:false})
    } else {
      //crear el query y ? para impedir scripts SQL y un hackeo
        const [row] = await cnn.query(
          "INSERT INTO users (dni,username,email,password) VALUES ( ? , ? , ? , ?)",
          [dni,username,  email, password]
        );

      console.log(row);

      //comprobar si se insertaron los datos
      if (row.affectedRows === 1) {
        //si se insertó
        return res.json({
          message: "Se creó el usuario con éxito",
          success: true
        });

      } else {
        return res.status(500).json({ message: "no se creó el usuario" });
      }
    }
  } catch (error) {
    console.log("create user", error.message);
    res.json({
      message: "No se creó el usuario",
      success: false
    });
  }
};

//generar el token
const getToken = (payload) => {
  try {
    const token = jwt.sign(payload, secreto, { expiresIn: "180d" });
    return token;
  } catch (error) {
    console.log(error)
    return error
  }
};

//middleware
export const auth = (req, res, next) => {
  const token = req.headers["mani"];
  console.log("Token recibido:", token);

  if (!token) return res.status(400).json({ message: "sin token" });

  
  jwt.verify(token, secreto, (error, user) => {
    if (error) {
      console.log("Error en la verificación del token:", error);
      return res.status(400).json({ message: "token inválido" });
    } else {
      console.log("Usuario decodificado del token:", user); // Verificar si el dni está en el payload
      req.dni = user.sub;
      next();
    }
  });
  
};

export const createRoutine = async (req, res) => {
  try {
    const cnn = await connect();
    const { nombre, duracion, foto } = req.body; // Asegúrate de que estos campos sean enviados en el cuerpo de la solicitud
    const dni = req.dni
    console.log("DNI desde crear rutian",dni)
    const [row] = await cnn.query(
      "INSERT INTO rutina (nombre, duracion, foto, creador_dni) VALUES (?, ?, ?, ?)",
      [nombre, duracion, foto, dni]
    );

    if (row.affectedRows === 1) {
      return res.json({
        message: "Rutina creada con éxito",
        success: true,
        rutinaId: row.insertId // Devolvemos el ID de la rutina creada
      });
    } else {
      return res.status(500).json({ message: "No se pudo crear la rutina" });
    }
  } catch (error) {
    console.log("createRoutine", error.message);
    res.status(500).json({ message: "Error al crear la rutina", success: false });
  }
};


export const getPhotos = (req, res) => {
  try {
    const photosDirectory = path.join(__dirname, 'fotos');
    const photos = fs.readdirSync(photosDirectory).filter(file => {
      // Filtrar solo archivos de imagen, por ejemplo, jpg, png
      return file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg');
    });

    res.json({
      message: "Fotos encontradas",
      success: true,
      photos, // Lista de nombres de archivos
    });
  } catch (error) {
    console.log("getPhotos", error.message);
    res.status(500).json({ message: "Error al obtener las fotos", success: false });
  }
};


export const addExercisesToRoutine = async (req, res) => {
  try {
    const cnn = await connect();
    const { rutina_id, ejercicios } = req.body; // ejercicios debe ser un array de objetos con ejercicio_id y series

    // Verificar si la rutina existe
    const [rutina] = await cnn.query("SELECT * FROM rutina WHERE id = ?", [rutina_id]);
    if (rutina.length === 0) {
      return res.status(404).json({ message: "La rutina no existe", success: false });
    }

    // Agregar cada ejercicio a la rutina con la cantidad de series
    const insertPromises = ejercicios.map(({ ejercicio_id, series }) => {
      return cnn.query(
        "INSERT INTO rutina_ejercicio (rutina_id, ejercicio_id, series) VALUES (?, ?, ?)",
        [rutina_id, ejercicio_id, series]
      );
    });

    // Ejecutar todas las inserciones
    await Promise.all(insertPromises);

    return res.json({ message: "Ejercicios agregados a la rutina con éxito", success: true });
  } catch (error) {
    console.log("addExercisesToRoutine", error.message);
    res.status(500).json({ message: "Error al agregar ejercicios a la rutina", success: false });
  }
};



export const getAllEjercicios = async (req, res) => {
  try {
    const cnn = await connect();  // Conexión a la base de datos
    const query = "SELECT * FROM ejercicio";  // Consulta para obtener todos los ejercicios

    const [rows] = await cnn.query(query);  // Ejecuta la consulta
    console.log(rows);  // Para verificar los datos que se están enviando
    return res.status(200).json({ ejercicios: rows });  // Retorna los ejercicios en formato JSON

  } catch (error) {
    console.log("getAllEjercicios", error.message);  // Manejo de errores
    return res.status(500).json({ message: "Error al obtener los ejercicios" });
  }
};

export const getRoutineWithExercises = async (req, res) => {
  try {
    const cnn = await connect();
    const { rutina_id } = req.params; // Obtener rutina_id de los parámetros de la ruta

    // Verificar si la rutina existe
    const [rutina] = await cnn.query("SELECT * FROM rutina WHERE id = ?", [rutina_id]);
    if (rutina.length === 0) {
      return res.status(404).json({ message: "La rutina no existe", success: false });
    }

    // Obtener los ejercicios vinculados a la rutina junto con las series
    const [ejercicios] = await cnn.query(`
      SELECT e.id AS id, e.nombre, re.series 
      FROM rutina_ejercicio re
      JOIN ejercicio e ON re.ejercicio_id = e.id
      WHERE re.rutina_id = ?`, [rutina_id]
    );
    
    console.log("Ejercicios encontrados:", ejercicios); // Agrega esto para depurar
    
    if (ejercicios.length === 0) {
      return res.json({
        message: "No se encontraron ejercicios para esta rutina",
        success: true,
        rutina: rutina[0],
        ejercicios: []
      });
    }
    

    // Devolver la rutina junto con sus ejercicios y las series correspondientes
    return res.json({
      message: "Rutina encontrada",
      success: true,
      rutina: rutina[0],
      ejercicios: ejercicios // Ahora los ejercicios incluyen el campo 'series'
    });
  } catch (error) {
    console.log("getRoutineWithExercises", error.message);
    res.status(500).json({ message: "Error al obtener la rutina con ejercicios", success: false });
  }
};


export const getAllRoutines = async (req, res) => {
  try {
    const cnn = await connect();

    // Obtener todas las rutinas
    const [routines] = await cnn.query("SELECT * FROM rutina");

    // Verificar si hay rutinas
    if (routines.length === 0) {
      return res.status(404).json({ message: "No hay rutinas disponibles", success: false });
    }

    // Devolver todas las rutinas encontradas
    return res.json({
      message: "Rutinas encontradas",
      success: true,
      routines, // Aquí retornamos todas las rutinas
    });
  } catch (error) {
    console.log("getAllRoutines", error.message);
    res.status(500).json({ message: "Error al obtener las rutinas", success: false });
  }
};

export const deleteRoutine = async (req, res) => {
  try {
    const cnn = await connect();
    const { rutina_id } = req.params; // Obtener el ID de la rutina desde los parámetros de la ruta

    // Verificar si la rutina existe
    const [rutina] = await cnn.query("SELECT * FROM rutina WHERE id = ?", [rutina_id]);
    if (rutina.length === 0) {
      return res.status(404).json({ message: "La rutina no existe", success: false });
    }

    // Eliminar los ejercicios vinculados a la rutina desde la tabla rutina_ejercicio
    await cnn.query("DELETE FROM rutina_ejercicio WHERE rutina_id = ?", [rutina_id]);

    // Eliminar la rutina de la tabla rutina
    const [result] = await cnn.query("DELETE FROM rutina WHERE id = ?", [rutina_id]);

    // Verificar si la eliminación fue exitosa
    if (result.affectedRows === 1) {
      return res.json({
        message: "Rutina eliminada con éxito",
        success: true
      });
    } else {
      return res.status(500).json({ message: "No se pudo eliminar la rutina", success: false });
    }
  } catch (error) {
    console.log("deleteRoutine", error.message);
    res.status(500).json({ message: "Error al eliminar la rutina", success: false });
  }
};


export const updateUserDetails = async (req, res) => {
  try {
    const cnn = await connect(); // Conexión a la base de datos
    const dni = req.dni; // Obtener el DNI del usuario autenticado desde el token (agregado por middleware `auth`)

    // Verificar si el DNI está siendo recibido correctamente
    console.log("DNI desde el token:", dni); // Agregar este log para depurar

    // Verificar si el usuario existe
    const [user] = await cnn.query("SELECT * FROM users WHERE dni = ?", [dni]);

    if (user.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado", success: false });
    }

    const { newEmail, newPassword, newUsername } = req.body;

    // Verificar duplicados de email (si se proporciona un nuevo email)
    if (newEmail) {
      const [emailCheck] = await cnn.query("SELECT * FROM users WHERE email = ? AND dni != ?", [newEmail, dni]);
      if (emailCheck.length > 0) {
        return res.status(400).json({ message: "El email ya está en uso por otro usuario", success: false });
      }
    }

    // Actualizar los campos proporcionados
    const updateFields = {};
    if (newEmail) updateFields.email = newEmail;
    if (newPassword) updateFields.password = newPassword;
    if (newUsername) updateFields.username = newUsername;

    const fields = Object.keys(updateFields);
    const values = Object.values(updateFields);

    if (fields.length > 0) {
      const setClause = fields.map((field) => `${field} = ?`).join(", ");
      values.push(dni); // Agregar DNI del usuario al final para la cláusula WHERE

      const query = `UPDATE users SET ${setClause} WHERE dni = ?`;
      const [result] = await cnn.query(query, values);

      if (result.affectedRows === 1) {
        return res.json({
          message: "Usuario actualizado con éxito",
          success: true,
        });
      } else {
        return res.status(500).json({ message: "No se pudo actualizar el usuario", success: false });
      }
    } else {
      return res.status(400).json({ message: "No se proporcionaron campos para actualizar", success: false });
    }
  } catch (error) {
    console.log("updateUserDetails", error.message);
    res.status(500).json({ message: "Error al actualizar el usuario", success: false });
  }
};


