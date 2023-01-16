import express from "express";
import formidable from "express-formidable";

const router = express.Router();

// middleware
import { requireSignin, isTeacher, isEnrolled} from "../middlewares";

// controllers
import {
  uploadImage,
  removeImage,
  create,
  read,
  uploadVideo,
  removeVideo,
  addLesson,
  update,
  removeLesson,
  updateLesson,
  publishCourse,
  unpublishCourse,
  courses,
  checkEnrollement,
  freeEnrollment,
  paidEnrollment,
  chapaSuccess,
  userCourses,
  markCompleted,
  listCompleted,
  markIncomplete,
  paymentSuccess,
} from "../controllers/course";

router.get("/courses", courses);
// image
router.post("/course/upload-image", uploadImage);
router.post("/course/remove-image", removeImage);
// course
router.post("/course", requireSignin, isTeacher, create);
router.put("/course/:slug", requireSignin, update);
router.get("/course/:slug", read);
router.post(
  "/course/video-upload/:teacherId",
  requireSignin,
  formidable(),
  uploadVideo
);
router.post("/course/video-remove/:teacherId", requireSignin, removeVideo);

// publish unpublish
router.put("/course/publish/:courseId", requireSignin, publishCourse);
router.put("/course/unpublish/:courseId", requireSignin, unpublishCourse);

// `/api/course/lesson/${slug}/${course.teacher._id}`,
router.post("/course/lesson/:slug/:teacherId", requireSignin, addLesson);
router.put("/course/lesson/:slug/:teacherId", requireSignin, updateLesson);
router.put("/course/:slug/:lessonId", requireSignin, removeLesson);

router.get("/check-enrollment/:courseId", requireSignin, checkEnrollement);

// enrollment
router.post("/free-enrollment/:courseId", requireSignin, freeEnrollment);
router.post("/paid-enrollment/:courseId", requireSignin, paidEnrollment);
// router.get("/chapa-success/:courseId", requireSignin, chapaSuccess);
// router.get("/payment-success/", requireSignin, paymentSuccess);

router.get("/user-courses", requireSignin, userCourses);
router.get('/user/course/:slug', requireSignin, isEnrolled, read);

//mark completed
router.post("/mark-completed", requireSignin, markCompleted);
router.post("/list-completed", requireSignin, listCompleted);
router.post("/mark-incomplete", requireSignin, markIncomplete);



module.exports = router;