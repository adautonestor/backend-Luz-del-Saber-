const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/authMiddleware')
const teacherTasksController = require('../controllers/teacherTasksController')

// Todas las rutas requieren autenticación
router.use(authenticateToken)

// GET /api/teacher-tasks - Obtener mis tareas
router.get('/', teacherTasksController.getMyTasks)

// POST /api/teacher-tasks - Crear tarea
router.post('/', teacherTasksController.createTask)

// PUT /api/teacher-tasks/:id - Actualizar tarea
router.put('/:id', teacherTasksController.updateTask)

// PATCH /api/teacher-tasks/:id/toggle - Toggle completado
router.patch('/:id/toggle', teacherTasksController.toggleTask)

// DELETE /api/teacher-tasks/:id - Eliminar tarea
router.delete('/:id', teacherTasksController.deleteTask)

module.exports = router
