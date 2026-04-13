const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const allowedDomain = process.env.ALLOWED_DOMAIN || '@st.niituniversity.in';
        
        // Check if email ends with allowed domain
        if (!email.endsWith(allowedDomain)) {
          return done(null, false, { 
            message: `Only ${allowedDomain} emails are allowed` 
          });
        }

        // Check if user exists
        let user = await User.findOne({ email });

        if (user) {
          // Update last login
          user.lastLogin = new Date();
          await user.save();
          return done(null, user);
        }

        // Create new user
        user = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: email,
          avatar: profile.photos[0]?.value,
          phone: '', // Will be collected on first login
          isNewUser: true
        });

        await user.save();
        done(null, user);
      } catch (err) {
        console.error('Google Strategy Error:', err);
        done(err, null);
      }
    }
  )
);

module.exports = passport;