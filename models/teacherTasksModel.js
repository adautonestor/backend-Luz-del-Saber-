const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Obtener tareas de un profesor
 */
const getByTeacherId = async (teacherId) => {
  return prisma.teacher_tasks.findMany({
    where: {
      teacher_id: parseInt(teacherId),
      status: 'active'
    },
    orderBy: [
      { completed: 'asc' },
      { date_time_registration: 'desc' }
    ]
  })
}

/**
 * Crear una nueva tarea
 */
const create = async (data) => {
  return prisma.teacher_tasks.create({
    data: {
      teacher_id: parseInt(data.teacher_id),
      description: data.description,
      completed: data.completed || false,
      status: 'active',
      user_id_registration: parseInt(data.teacher_id)
    }
  })
}

/**
 * Actualizar una tarea
 */
const update = async (id, data) => {
  const updateData = {}

  if (data.description !== undefined) {
    updateData.description = data.description
  }
  if (data.completed !== undefined) {
    updateData.completed = data.completed
  }
  if (data.user_id_modification) {
    updateData.user_id_modification = parseInt(data.user_id_modification)
  }

  return prisma.teacher_tasks.update({
    where: { id: parseInt(id) },
    data: updateData
  })
}

/**
 * Eliminar una tarea (soft delete)
 */
const remove = async (id, userId) => {
  return prisma.teacher_tasks.update({
    where: { id: parseInt(id) },
    data: {
      status: 'inactive',
      user_id_modification: userId ? parseInt(userId) : null
    }
  })
}

/**
 * Obtener una tarea por ID
 */
const getById = async (id) => {
  return prisma.teacher_tasks.findUnique({
    where: { id: parseInt(id) }
  })
}

module.exports = {
  getByTeacherId,
  create,
  update,
  remove,
  getById
}
