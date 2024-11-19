import { Router } from "express";
import { createUsers, deleteRoutine, logIn, getall, updateUserDetails, getAllEjercicios, createRoutine,addExercisesToRoutine, getRoutineWithExercises, getRoutineById, auth , getAllRoutines, getPhotos } from "../controller/users";
const routerUsers = Router();

/**
 * @swagger
 * /user/login:
 *  post:
 *    summary: loguear usuario
 */
routerUsers.post("/users/login", logIn);

/**
 * @swagger
 * /user/usersp:
 *  post:
 *    summary: crea usuarios
 */
routerUsers.post("/user/usersp", createUsers);



/**
 * @swagger
 * /user/materias/:dni:
 *  get:
 *    summary: Obtener materias asociadas a un alumno
 */
routerUsers.get("/getAllEjercicios", getAllEjercicios)


/**
 * @swagger
 * /user/createRoutine:
 *  post:
 *    summary: Crear una nueva rutina
 */
routerUsers.post("/user/createRoutine",auth, createRoutine);

/**
 * @swagger
 * /user/createRoutine:
 *  post:
 *    summary: Crear una nueva rutina
 */
routerUsers.post("/user/addExercisesToRoutine", addExercisesToRoutine);


/**
 * @swagger
 * /user/rutina/{rutina_id}:
 *  get:
 *    summary: Obtener rutina con ejercicios vinculados
 */
routerUsers.get("/user/rutina/:rutina_id", getRoutineWithExercises);


/**
 * @swagger
 * /user/rutina/{rutina_id}:
 *  get:
 *    summary: Obtener rutina con ejercicios vinculados
 */
routerUsers.get("/user/getAllRoutines", getAllRoutines);


/**
 * @swagger
 * /user/rutina/{rutina_id}:
 *  get:
 *    summary: Obtener rutina con ejercicios vinculados
 */
routerUsers.get("/user/getPhotos", getPhotos);



// Configura la ruta para eliminar una rutina
routerUsers.delete('/rutina/:rutina_id', deleteRoutine);



routerUsers.put("/user/update", auth, updateUserDetails);

export default routerUsers;
