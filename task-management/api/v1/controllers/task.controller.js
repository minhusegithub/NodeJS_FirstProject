const Task = require("../models/task.model");

const paginationHelper = require("../../../helpers/pagination");

module.exports.index = async (req, res) => {
    const find = {
        deleted: false
    }
    
    if(req.query.status){
        find.status = req.query.status;
    }

    //Pagination
    let initPagination = {
        currentPage: 1,
        limitItems: 2
    };

    const countTasks = await Task.countDocuments(find);
    const objectPagination = paginationHelper(
        initPagination,
        req.query,
        countTasks
    );
    // End pagination


    // Sort
    const sort = {};
    if(req.query.sortKey && req.query.sortValue){
        sort[req.query.sortKey] = req.query.sortValue;
    }

    const tasks = await Task.find(find)
    .sort(sort)
    .skip(objectPagination.skip)
    .limit(objectPagination.limitItems);

    res.json({
        tasks
       
    });
   
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
