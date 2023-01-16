import express from "express";

const router = express.Router();

// middleware
import { requireSignin } from "../middlewares";

// controllers
import {
  makeTeacher,
  // getAccountStatus,
  currentTeacher,
  teacherCourses,
  studentCount,
} from "../controllers/teacher";

router.post("/make-teacher", requireSignin, makeTeacher);
// router.post("/get-account-status", requireSignin, getAccountStatus);
router.get("/current-teacher", requireSignin, currentTeacher);

router.get("/teacher-courses", requireSignin, teacherCourses);

router.post("/teacher/student-count", requireSignin, studentCount);


module.exports = router;
