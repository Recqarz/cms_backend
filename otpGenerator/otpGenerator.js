export const otpGenerator = () => {
  const otp = (Math.floor(Math.random() * 900000) + 100000).toString();
  const expireTime = Date.now() + 1000 * 60 * 5;
  const otpValidation = {
    otp: otp,
    expireTime: expireTime,
  };
  return otpValidation;
};
