const express = require('express');
const router = express.Router();



const Task = require("../../../models/task.model");

router.get("/", async (req, res) => {
    // const tasks = await Task.find({deleted: false});

    // res.json(tasks);
    res.send("Hello World");
});

router.get("/detail/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const task = await Task.findById({_id :id});

        res.json(task);
    } catch (error) {
        res.json("Task not found");
    }

});


module.exports = router;