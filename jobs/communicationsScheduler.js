/**
 * Scheduler para comunicados programados
 * Verifica periódicamente si hay comunicados que deben enviarse
 * y actualiza su estado a 'sent' cuando llega la hora programada
 */

const {
  getScheduledCommunicationsToSend,
  sendScheduledCommunication,
  getRecipientUserIds,
  createReadConfirmationsForRecipients
} = require('../models/communicationsModel');

// Intervalo de verificación en milisegundos (1 minuto)
const CHECK_INTERVAL = 60 * 1000;

// Variable para almacenar el ID del intervalo
let schedulerInterval = null;

/**
 * Procesa los comunicados programados que deben enviarse
 * Busca comunicados con scheduled_date <= NOW() y status='scheduled'
 * y los actualiza a status='sent'
 */
const processScheduledCommunications = async () => {
  try {
    // Obtener comunicados programados que deben enviarse
    const scheduledComms = await getScheduledCommunicationsToSend();

    if (scheduledComms.length === 0) {
      return; // No hay comunicados programados para enviar
    }

    console.log(`📅 [SCHEDULER] Encontrados ${scheduledComms.length} comunicado(s) programado(s) para enviar`);

    // Procesar cada comunicado
    for (const comm of scheduledComms) {
      try {
        const sent = await sendScheduledCommunication(comm.id);
        console.log(`✅ [SCHEDULER] Comunicado ID ${comm.id} "${comm.title}" enviado exitosamente`);
        console.log(`   - Programado para: ${new Date(comm.scheduled_date).toLocaleString('es-PE')}`);
        console.log(`   - Enviado a las: ${new Date(sent.send_date).toLocaleString('es-PE')}`);

        // Crear registros de confirmación para todos los destinatarios
        try {
          const recipientUserIds = await getRecipientUserIds(comm.recipients);
          if (recipientUserIds.length > 0) {
            await createReadConfirmationsForRecipients(comm.id, recipientUserIds, null);
            console.log(`   - Enviado a ${recipientUserIds.length} destinatarios`);
          }
        } catch (confError) {
          console.error(`   - Error creando confirmaciones:`, confError.message);
        }
      } catch (error) {
        console.error(`❌ [SCHEDULER] Error al enviar comunicado ID ${comm.id}:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ [SCHEDULER] Error al procesar comunicados programados:', error.message);
  }
};

/**
 * Inicia el scheduler de comunicados programados
 * Ejecuta una verificación inmediata y luego cada CHECK_INTERVAL ms
 */
const startScheduler = () => {
  if (schedulerInterval) {
    console.log('⚠️  [SCHEDULER] El scheduler ya está en ejecución');
    return;
  }

  console.log('🚀 [SCHEDULER] Iniciando scheduler de comunicados programados');
  console.log(`   - Intervalo de verificación: ${CHECK_INTERVAL / 1000} segundos`);

  // Ejecutar verificación inmediata al iniciar
  processScheduledCommunications();

  // Configurar intervalo para verificaciones periódicas
  schedulerInterval = setInterval(processScheduledCommunications, CHECK_INTERVAL);

  console.log('✅ [SCHEDULER] Scheduler iniciado correctamente');
};

/**
 * Detiene el scheduler de comunicados programados
 */
const stopScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('🛑 [SCHEDULER] Scheduler detenido');
  }
};

/**
 * Verifica si el scheduler está en ejecución
 * @returns {boolean} true si está en ejecución
 */
const isRunning = () => {
  return schedulerInterval !== null;
};

/**
 * Ejecuta una verificación manual (útil para testing)
 */
const runManualCheck = async () => {
  console.log('🔍 [SCHEDULER] Ejecutando verificación manual...');
  await processScheduledCommunications();
  console.log('✅ [SCHEDULER] Verificación manual completada');
};

module.exports = {
  startScheduler,
  stopScheduler,
  isRunning,
  runManualCheck,
  processScheduledCommunications
};
