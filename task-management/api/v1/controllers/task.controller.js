const Task = require("../models/task.model");

module.exports.index = async (req, res) => {
    const find = {
        deleted: false
    }
    
    if(req.query.status){
        find.status = req.query.status;
    }

    const tasks = await Task.find(find).sort({
        title: 'asc'
    });

    res.json(tasks);
   
}

module.exports.detail = async (req, res) => {
    try {
        const id = req.params.id;
        const task = await Task.findById({_id :id});

        res.json(task);
    } catch (error) {
        res.json("Task not found");
    }

};
