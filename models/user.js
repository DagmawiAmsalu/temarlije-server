import mongoose from 'mongoose';
const { Schema } = mongoose;
const {ObjectId} = Schema;

const userSchema = new Schema({
    firstName:{
        type: String,
        trim: true,
        required: true,
    },
    lastName:{
        type: String,
        trim: true,
        required: true,
    },
    email:{
        type: String,
        trim: true,
        required: true,
        unique: true,
    },
    password:{
        type: String,
        required: true,
        min: 6,
        max: 64,
    },
    picture:{
        type: String,
        default: '/avatar.png',
    },
    role:{
        type: [String],
        default: ["Student"],
        enum: ["Student", "Teacher", "Organization"],
    },
    stripe_account_id: "",
    stripe_seller: {},
    stripeSession: {},

    chapa_secret_key : "",

    passwordResetCode: {
        data: String,
        default: "",
    },
    courses: [{ type: ObjectId, ref: "Course" }],
}, 
{timestamps: true}
);

export default mongoose.model('User', userSchema);