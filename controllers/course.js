import AWS from 'aws-sdk';
import {nanoid} from 'nanoid';
import Course from '../models/course';
import Completed from "../models/completed";
import slugify from 'slugify';
import {readFileSync} from "fs";
import User from '../models/user';
import axios from "axios";

const Chapa = require('./chapa.js')


const awsConfig = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    apiVersion: process.env.AWS_API_VERSION,
};

const S3 = new AWS.S3(awsConfig);

export const uploadImage = async (req, res) => {
    // console.log(req.body);
    try {
        const {image} =req.body;
        if(!image) return res.status(400).send("No image");

        // prepare the image
        const base64Data = new Buffer.from(
            image.replace(/^data:image\/\w+;base64,/, ""), 
            "base64"
            );

            const type = image.split(';')[0].split('/')[1];

            //image params
            const params = {
                Bucket: "temar-lije-bucket",
                Key: `${nanoid()}.${type}`,
                Body: base64Data,
                ACL: 'public-read',
                ContentEncoding: "base64",
                ContentType: `image/${type}`,
            };

            // upload to s3
            S3.upload(params, (err, data) => {
                if(err) {
                    console.log(err);
                    return res.sendStatus(400);
                }
                console.log(data);
                res.send(data);
            });

    } catch (err) {
        console.log(err);
    }
};

export const removeImage = async (req, res) => {
    try {
        const {image} = req.body;
        // image params
        const params = {
            Bucket: image.Bucket,
            Key: image.Key,
        };

        // send remove request to S3
        S3.deleteObject(params, (err, data) => {
            if(err) {
                console.log(err);
                res.sendStatus(400);
            }
            res.send({ok: true});
        });
    } catch (err) {
        console.log(err);
    }
};

export const create = async (req, res) => {
    // console.log("CREATE COURSE", req.body);
    // return;
    try {
        const alreadyExist = await Course.findOne({
            slug: slugify(req.body.name.toLowerCase()),
        });
        if(alreadyExist) return res.status(400).send('Title is taken');

        const course = await new Course({
            slug: slugify(req.body.name),
            teacher: req.auth._id, 
            ...req.body,
        }).save();

        res.json(course);
    } catch (err) {
        console.log(err);
        return res.status(400).send("Course create failed. Try again.");
    }
};

export const read = async (req, res) => {
    try {
        const course = await Course.findOne({slug: req.params.slug})
        .populate('teacher', '_id firstName lastName')
        .exec();
        res.json(course);
    } catch (err) {
        console.log(err);
    }
}

export const uploadVideo = async (req, res) => {
    try {
    // console.log("req.auth._id", req.auth._id);
    // console.log("req.params.teacherId", req.params.teacherId);
    if (req.auth._id != req.params.teacherId) {
        return res.status(400).send("Unauthorized");
      }
  
      const { video } = req.files;
      // console.log(video);
      if (!video) return res.status(400).send("No video");

        // video params
        const params ={
            Bucket: "temar-lije-bucket",
            Key: `${nanoid()}.${video.type.split("/")[1]}`,  // video/mp4
            Body: readFileSync(video.path),
            ACL: 'public-read',
            ContentType: video.type,      
        };

        //upload to s3
        S3.upload(params, (err, data) => {
            if(err){
                console.log(err);
                res.sendStatus(400);
            }
            console.log(data);
            res.send(data);
        })
    } catch (err) {
        console.log(err);
    }
};


export const removeVideo = async (req, res) => {
    try {

        if (req.auth._id != req.params.teacherId){
            return res.status(400).send("Unauthorized");
        }

        const { Bucket, Key } = req.body;
        // console.log(video);

        // video params
        const params ={
            Bucket,
            Key,   
        };

        //upload to s3
        S3.deleteObject(params, (err, data) => {
            if(err){
                console.log(err);
                res.sendStatus(400);
            }
            console.log(data);
            res.send({ ok: true });
        })
    } catch (err) {
        console.log(err);
    }
};

export const addLesson = async (req, res) => {
    try {
        const {slug, teacherId} = req.params;
        const {title, content, video} = req.body;

        if (req.auth._id != teacherId){
                return res.status(400).send("Unauthorized");
            }

        const updated = await Course.findOneAndUpdate(
            {slug}, 
            {
            $push: {lessons: {title, content, video, slug: slugify(title)}}
            }, 
        {new: true}
        ).populate("teacher", "_id name")
        .exec();
        res.json(updated);
    } catch (err) {
        console.log(err);
        return res.status(400).send("Add lesson failed");
    }
};

export const update = async (req, res) => {
    try {
        const { slug } = req.params;
    // console.log(slug);
    const course = await Course.findOne({ slug }).exec();
    // console.log("Course Found => ", course);
    if(req.auth._id != course.teacher){
        return res.status(400).send("Unauthorized");
    }

    const updated = await Course.findOneAndUpdate({ slug }, req.body, {
            new: true,
        }).exec();

    res.json(updated);
    } catch (err) {
        console.log(err);
        return res.status(400).send(err.message);
    }
};

export const removeLesson = async (req, res) => {
    const { slug, lessonId } = req.params;
    const course = await Course.findOne({ slug }).exec();
    if(req.auth._id != course.teacher){
        return res.status(400).send("Unauthorized");
    }

    const deletedCourse = await Course.findByIdAndUpdate(course._id, {
        $pull: {lessons: {_id: lessonId}},
    }).exec();

    res.json({ok: true});
};

export const updateLesson = async (req, res) => {
    try {
        // console.log("Update lesson",req.body);
    const { slug } = req.params;
    const {_id, title, content, video, free_preview} = req.body;
    const course = await Course.findOne({slug}).select("teacher").exec();

    if(course.teacher._id != req.auth._id){
        return res.status(400).send("Unauthorized");
    }

    const updated = await Course.updateOne(
        {"lessons._id": _id}, 
        {
        $set: {
            "lessons.$.title": title,
            "lessons.$.content": content,
            "lessons.$.video": video,
            "lessons.$.free_preview": free_preview,
        },
    },
    {new: true}
    ).exec();
    // console.log("updated", updated);
    res.json({ok: true});
    } catch (err) {
        console.log(err);
        return res.status(400).send("Update lesson failed");
    }
};

export const publishCourse = async (req, res) => {
    try {
        const {courseId} = req.params
        const course = await Course.findById(courseId).select("teacher").exec();

        if(course.teacher._id != req.auth._id){
            return res.status(400).send("Unauthorized");
        }

        const updated = await Course.findByIdAndUpdate(
            courseId, 
            {published: true}, 
            {new: true}
            ).exec();
            res.json(updated);
    } catch (err) {
        console.log(err);
        return res.status(400).send("Publish course failed");
    }
};

export const unpublishCourse = async (req, res) => {
    try {
        const {courseId} = req.params
        const course = await Course.findById(courseId).select("teacher").exec();

        if(course.teacher._id != req.auth._id){
            return res.status(400).send("Unauthorized");
        }

        const updated = await Course.findByIdAndUpdate(
            courseId, 
            {published: false}, 
            {new: true}
            ).exec();
            res.json(updated);
    } catch (err) {
        console.log(err);
        return res.status(400).send("unpublish course failed");
    }
};

export const courses = async (req, res) => {
    const all = await Course.find({published: true})
    .populate("teacher", "_id firstName lastName")
    .exec();
    res.json(all);
}

export const checkEnrollement = async (req, res) => {
    const {courseId} = req.params;
    //find courses of the currently logged in users
    const user = await User.findById(req.auth._id).exec();
    //check if course id is found in user courses array
    let ids = [];
    let length = user.courses && user.courses.length;
    for (let i = 0; i < length; i++) {
        ids.push(user.courses[i].toString())
    }
    res.json({
        status: ids.includes(courseId),
        course: await Course.findById(courseId).exec(),
    });
};

export const freeEnrollment = async  (req, res) => {
    try {
        // check if course is free or paid
        const course = await Course.findById(req.params.courseId).exec()
        if(course.paid) return;

        const result = await User.findByIdAndUpdate(
            req.auth._id, 
            { 
                $addToSet: { courses: course._id },
            }, 
        {new: true}
        ).exec();
        res.json({
            message: "Congratulations! You have successfully enrolled",
            course,
        })
    } catch (err) {
        console.log("Free enrollment err", err);
        return res.status(400).send("Enrollment create failed")
    }
};

export const userCourses = async (req, res) => {
    const user = await User.findById(req.auth._id).exec();
    const courses = await Course.find({_id: {$in: user.courses}})
    .populate("teacher", "_id firstName lastName")
    .exec();
    res.json(courses);
};

export const markCompleted = async (req, res) => {
    const {courseId, lessonId} = req.body;
    // console.log(courseId, lessonId);
    // find if user with that course is already created
    const existing = await Completed.findOne({
        user: req.auth._id,
        course: courseId,
    }).exec();

    if(existing) {
        // update
        const updated = await Completed.findOneAndUpdate({
            user: req.auth._id, 
            course: courseId,
        }, {
            $addToSet: { lessons: lessonId },
        }
    ).exec();
    res.json({ ok: true });
    }else {
        // create
        const created = await new Completed({
            user: req.auth._id, 
            course: courseId,
            lessons: lessonId,
        }).save();
        res.json({ ok: true });
    }
};

export const listCompleted = async(req, res) => {
    try {
        const list = await Completed.findOne({
            user: req.auth._id, 
            course: req.body.courseId,
        }).exec();
        list && res.json(list.lessons);
    } catch (err) {
        console.log(err);
    }
};

export const markIncomplete = async(req, res) => {
    try {
        const {courseId, lessonId} = req.body
        
        const updated = await Completed.findOneAndUpdate({
            user: req.auth._id, 
            course: courseId
        }, {
            $pull: {lessons: lessonId },
        }
        ).exec();
        res.json({ ok : true });
    } catch (err) {
        console.log(err);
    }
}

const config = {
    headers: {
        Authorization: `Bearer ${process.env.CHAPA_AUTH}`
    }
}

export const paidEnrollment = async (req, res) => {
    try{
        const user = await User.findById(req.auth._id).select("-password").exec();
    //check if course is free or paid
    const course = await Course.findById(req.params.courseId)
    .populate("teacher")
    .exec();
    if (!course.paid) return;
      
    // chapa redirect you to this url when payment is successful
    const CALLBACK_URL = "http://localhost:3000/chapa/callback"
    const RETURN_URL = "http://localhost:3000/user"

    // a unique reference given to every transaction
    const TEXT_REF = "tx-myecommerce12345-" + Date.now()

    var amount = course.price;
    const currency = 'ETB';
    var email = user.email;
    var first_name = user.firstName;
    var last_name = user.lastName;

    // form data
    const data = {
    amount: amount, 
    currency: currency,
    email: email,
    first_name: first_name,
    last_name: last_name,
    tx_ref: TEXT_REF,
    callback_url: CALLBACK_URL + TEXT_REF,
    return_url: RETURN_URL
    }

    // post request to chapa
    await axios.post(process.env.CHAPA_URL, data, config)
    .then((response) => {
    res.send(response.data.data.checkout_url)
    })
    .catch((err) => console.log(err))

    await User.findByIdAndUpdate(user._id, {
        $addToSet: { courses: course._id }}).exec();

    }catch (err) {
    console.log("PAID ENROLLMENT ERR", err);
    return res.status(400).send("Enrollment create failed");
    }
}
    
// verification endpoint
export const chapaSuccess = async (req, res) => {

    // res.redirect(`${process.env.CHAPA_SUCCESS_URL}/${course._id}`)
    try{
    // find course
    const course = await Course.findById(req.params.courseId).exec();
    console.log("COURSE =>", course);
    // get user from db to get stripe session id
    const user = await User.findById(req.user._id).exec();
    console.log("USER =>", user);

        //verify the transaction 
        await axios.get("https://api.chapa.co/v1/transaction/verify/" + req.params.id, config)
            .then((response) = async () => {
                    console.log("Payment was successfully verified")
            }) 
            .catch((err) => console.log("Payment can't be verfied", err))
    }catch (err) {
                console.log("Chapa SUCCESS ERR =>", err);
                res.json({ success: false });
            }    
}

export const paymentSuccess = async (req, res) => {
    //res.render("success")

    const course = await Course.findById(req.params.courseId).exec();
    const user = await User.findById(req.user._id).exec();

    console.log(user);
    console.log(course);

    await User.findByIdAndUpdate(user._id, {
        $addToSet: { courses: course._id }}).exec();
}