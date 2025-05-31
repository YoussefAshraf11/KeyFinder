const successResponse = (data, statusCode = 200) => ({
  success: true,
  data
});

const errorResponse = (message, statusCode = 500) => ({
  success: false,
  error: {
    message,
    statusCode
  }
});

module.exports = {
  successResponse,
  errorResponse
};
