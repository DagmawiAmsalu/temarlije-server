import User from "../models/user";
import Course from "../models/course";
import queryString from "query-string";
const stripe = require("stripe")(process.env.STRIPE_SECRET);

export const makeTeacher = async (req, res) => {
  const {chapaSecretKey} = req.body;
  try {
    // 1. find user from db
    const user = await User.findById(req.auth._id).exec();
    // console.log('USER => ', user);
    // 2. if user dont have chapa key yet, then create new
    if (!user.chapa_secret_key) {
      
      const account = chapaSecretKey;
      // console.log('ACCOUNT => ', account)
      user.chapa_secret_key = account;
      user.save();

      const statusUpdated = await User.findByIdAndUpdate(
        user._id,
        {
          $addToSet: { role: "Teacher" },
        },
        { new: true }
      )
        .select("-password")
        .exec();
      res.json(statusUpdated);
    }
  } catch (err) {
    console.log("MAKE Teacher ERR ", err);
  }
};

export const currentTeacher = async (req, res) => {
  try {
    let user = await User.findById(req.auth._id).select("-password").exec();
    if(!user.role.includes("Teacher")) {
      return res.sendstaus(403);
    }else {
      res.json({ok : true});
    }
  } catch (err) {
    console.log(err);
  }
};

export const teacherCourses = async (req, res) => {
  try {
    const courses = await Course.find({teacher: req.auth._id}).sort({createdAt: -1}).exec();
    res.json(courses);
  } catch (err) {
    console.log(err);
  }
};

export const studentCount = async (req, res) => {
  try {
    const users = await User.find({courses: req.body.courseId}).select("_id").exec();
    res.json(users);
  } catch (err) {
    console.log(err);
  }
};
