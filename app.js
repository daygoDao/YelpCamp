const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync");
const {campgroundSchema} = require('./schemas.js')
const ExpressError = require("./utils/ExpressError");
const methodOverride = require("method-override");
const Campground = require("./models/campground");


mongoose.connect("mongodb://localhost:27017/yelp-camp", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("database connected");
});

const app = express();

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));

const validateCampground = (req, res, next) => {
  const { error } = campgroundSchema.validate(req.body)
  console.log(error)
  if(error) {
    const msg = error.details.map(err => err.message).join(',')
    throw new ExpressError(msg, 400);
  } else {
    next();
  }

}

app.get("/", (req, res) => {
  res.render("home");
});

app.get(
  "/campgrounds",
  wrapAsync(async (req, res) => {
    const campgrounds = await Campground.find({});
    res.render("campgrounds/index", { campgrounds });
  })
);

app.get("/campgrounds/new", (req, res) => {
  res.render("campgrounds/new");
});

app.post(
  "/campgrounds",
  validateCampground,
  wrapAsync(async (req, res, next) => {
    const campground = new Campground(req.body.campground);
    await campground.save();
    res.redirect("/campgrounds/" + campground._id);
  })
);

app.get(
  "/campgrounds/:id",
  wrapAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id);
    res.render("campgrounds/show", { campground });
  })
);

app.get(
  "/campgrounds/:id/edit",
  wrapAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id);
    res.render("campgrounds/edit", { campground });
  })
);

app.put(
  "/campgrounds/:id",
  validateCampground,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findByIdAndUpdate(
      id,
      { ...req.body.campground },
      { runValidators: true, new: true }
    );
    res.redirect(`/campgrounds/${campground._id}`);
    // res.send('ayooyo')
  })
);

app.delete(
  "/campgrounds/:id",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Campground.findByIdAndDelete(id);
    res.redirect("/campgrounds");
  })
);

app.all("*", (req, res, next) => {
  next(new ExpressError("Page not Found", 404));
});

app.use((err, req, res, next) => {
  const { status = 500 } = err;
  if (!err.message) err.message = `ruh roh shaggy`;
  res.status(status).render("error", { err });
});

app.listen(3000, () => {
  console.log("serving on port 3000");
});
