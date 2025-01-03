import { Router } from "express";
import { getTodos, addTodo, editTodo, deleteTodo } from "./todo.controller.js";

export const todoRoutes = Router();

todoRoutes.get("/get-alltask", getTodos);

todoRoutes.post("/add-task", addTodo);

todoRoutes.put("/edit-task/:id", editTodo);

todoRoutes.delete("/delete-task/:id", deleteTodo);