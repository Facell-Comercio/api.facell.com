const { startOfDay, formatDate, addDays } = require("date-fns")

module.exports = (range_datas)=>{
    let datas = []
    if(!range_datas){
        return datas
    }
    const {from, to} = range_datas;
    if(!from){
        return datas
    }
    if(from && !to){
        const date = formatDate(from, 'yyyy-MM-dd')
        datas.push(date)
        return datas
    }
    const startDate = startOfDay(from)
    const endDate = startOfDay(to)
    
    for (let dt = startDate; dt <= endDate; dt = addDays(dt, 1)) {
        datas.push(formatDate(dt, 'yyyy-MM-dd'));
    }
    return datas
}