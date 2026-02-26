const teacherTasksModel = require('../models/teacherTasksModel')

/**
 * Obtener tareas del profesor autenticado
 */
const getMyTasks = async (req, res) => {
  try {
    const teacherId = req.user.id

    const tasks = await teacherTasksModel.getByTeacherId(teacherId)

    res.json({
      success: true,
      tasks: tasks.map(task => ({
        id: task.id,
        description: task.description,
        completed: task.completed,
        createdAt: task.date_time_registration
      }))
    })
  } catch (error) {
    console.error('Error al obtener tareas:', error)
    res.status(500).json({
      success: false,
      error: 'Error al obtener las tareas'
    })
  }
}

/**
 * Crear una nueva tarea
 */
const createTask = async (req, res) => {
  try {
    const teacherId = req.user.id
    const { description } = req.body

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: 'La descripción es requerida'
      })
    }

    const task = await teacherTasksModel.create({
      teacher_id: teacherId,
      description: description.trim()
    })

    res.status(201).json({
      success: true,
      task: {
        id: task.id,
        description: task.description,
        completed: task.completed,
        createdAt: task.date_time_registration
      }
    })
  } catch (error) {
    console.error('Error al crear tarea:', error)
    res.status(500).json({
      success: false,
      error: 'Error al crear la tarea'
    })
  }
}

/**
 * Actualizar una tarea
 */
const updateTask = async (req, res) => {
  try {
    const { id } = req.params
    const teacherId = req.user.id
    const { description, completed } = req.body

    // Verificar que la tarea pertenece al profesor
    const existingTask = await teacherTasksModel.getById(id)
    if (!existingTask || existingTask.teacher_id !== teacherId) {
      return res.status(404).json({
        success: false,
        error: 'Tarea no encontrada'
      })
    }

    const updateData = {
      user_id_modification: teacherId
    }

    if (description !== undefined) {
      updateData.description = description.trim()
    }
    if (completed !== undefined) {
      updateData.completed = completed
    }

    const task = await teacherTasksModel.update(id, updateData)

    res.json({
      success: true,
      task: {
        id: task.id,
        description: task.description,
        completed: task.completed,
        createdAt: task.date_time_registration
      }
    })
  } catch (error) {
    console.error('Error al actualizar tarea:', error)
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la tarea'
    })
  }
}

/**
 * Eliminar una tarea
 */
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params
    const teacherId = req.user.id

    // Verificar que la tarea pertenece al profesor
    const existingTask = await teacherTasksModel.getById(id)
    if (!existingTask || existingTask.teacher_id !== teacherId) {
      return res.status(404).json({
        success: false,
        error: 'Tarea no encontrada'
      })
    }

    await teacherTasksModel.remove(id, teacherId)

    res.json({
      success: true,
      message: 'Tarea eliminada correctamente'
    })
  } catch (error) {
    console.error('Error al eliminar tarea:', error)
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la tarea'
    })
  }
}

/**
 * Toggle completado de una tarea
 */
const toggleTask = async (req, res) => {
  try {
    const { id } = req.params
    const teacherId = req.user.id

    // Verificar que la tarea pertenece al profesor
    const existingTask = await teacherTasksModel.getById(id)
    if (!existingTask || existingTask.teacher_id !== teacherId) {
      return res.status(404).json({
        success: false,
        error: 'Tarea no encontrada'
      })
    }

    const task = await teacherTasksModel.update(id, {
      completed: !existingTask.completed,
      user_id_modification: teacherId
    })

    res.json({
      success: true,
      task: {
        id: task.id,
        description: task.description,
        completed: task.completed,
        createdAt: task.date_time_registration
      }
    })
  } catch (error) {
    console.error('Error al toggle tarea:', error)
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la tarea'
    })
  }
}

module.exports = {
  getMyTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTask
}
