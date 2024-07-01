const cron = require('node-cron');


// Limpa a pasta temp todos os dias às 00:01
cron.schedule('0 0 1 * *', ()=>{
    clearLogs()
})