const validator = require("validator");
const usersCollection = require("../db").db().collection("users");
const bcrypt = require("bcryptjs");
const md5 = require("md5");

let User = function(data) {
  this.data = data;
  this.errors = [];
}

User.prototype.cleanUp = function() {
  if (typeof(this.data.username) != "string") {this.data.username = ""}
  if (typeof(this.data.email) != "string") {this.data.email = ""}
  if (typeof(this.data.password) != "string") {this.data.password = ""}

  // get rid of invalid properties
  this.data = {
    username: this.data.username.trim().toLowerCase(),
    email: this.data.email.trim().toLowerCase(),
    password: this.data.password
  }
}

User.prototype.validate = function() {
  return new Promise(async (resolve, reject) => {
    if (this.data.username == "") {this.errors.push("You must provide a username.")}
    if (this.data.username != "" && !validator.isAlphanumeric(this.data.username)) {this.errors.push("Username can only contain letters and numbers")}
    if (!validator.isEmail(this.data.email)) {this.errors.push("You must provide a valid email.")}
    if (this.data.password == "") {this.errors.push("You must provide a password.")}
    if (this.data.password.length > 0 && this.data.password.length < 5) {this.errors.push("Password must be at least 12 characters")}
    if (this.data.password.length > 50) {this.errors.push("Password cannot exceed 50 characters")}
    if (this.data.username.length > 0 && this.data.password.length < 3) {this.errors.push("Username must be at least 3 characters")}
    if (this.data.username.length > 30) {this.errors.push("Username cannot exceed 30 characters")}
  
    // check to see if username is taken
    if (this.data.username.length > 2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)) {
      let usernameExists = await usersCollection.findOne({username: this.data.username});
      if (usernameExists) {this.errors.push("That username is already taken.")}
    }
    
    // check to see if email is taken
    if (validator.isEmail(this.data.email)) {
      let emailExists = await usersCollection.findOne({email: this.data.email});
      if (emailExists) {this.errors.push("That email is already taken.")}
    }
    resolve()
  })
}

User.prototype.login = function() {
 return new Promise((resolve, reject) => {
  this.cleanUp();
  usersCollection.findOne({username: this.data.username}).then((attemptedUser) => {
    if (attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)) {
      this.data = attemptedUser;
      this.getAvatar();
      resolve("User Logged In")
    } else {
      reject("Invalid username / password.")
    }
  }).catch(function() {
    reject("Please try again later.");
  })
 })
}

User.prototype.register = function() {
  return new Promise(async (resolve, reject) => {
    // validate user data
    this.cleanUp();
    await this.validate();
  
    // only if there are no validation errors, save the user data into database
    if (!this.errors.length) {
      // hash user pw
      let salt = bcrypt.genSaltSync(10);
      this.data.password = bcrypt.hashSync(this.data.password, salt)
      await usersCollection.insertOne(this.data);
      this.getAvatar();
      resolve();
    } else {
      reject(this.errors);
    }
  })
}


User.prototype.getAvatar = function() {
  this.avatar = `https://gavatar.com/avatar/${md5(this.data.email)}?s=128`
}

module.exports = User;