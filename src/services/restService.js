const BASE_URL = "http://localhost:3000/";
const SCORES_ENDPOINT = "scores/";

const CLIENT_ERROR_MIN_CODE = 400;
const SERVER_ERROR_MAX_CODE = 599;
const INTERNET_DISCONNECTED_ERROR = "No internet connection";

const errorHandler = async (response) => {
  const resError = await response.json();
  let error = new Error(
    `${response.status}: ${resError.error ? resError.error : "Something went wrong, result couln't be provided"}`
  );
  if (response.status >= CLIENT_ERROR_MIN_CODE && response.status <= SERVER_ERROR_MAX_CODE) {
    error.originError = resError;
  }
  return Promise.reject(error);
};

const makeRequest = async (url, method = "GET", payload) => {
  const config =
    method === "GET"
      ? null
      : {
          method: "POST",
          headers: {
            "Content-Type": "application/json;charset=utf-8",
          },
          body: JSON.stringify(payload),
        };
  try {
    const res = await fetch(url, config);
    // Cases with 4xx/5xx status code
    if (!res.ok) {
      return errorHandler(res);
    }
    return res.json();
  } catch (e) {
    // internet connection case
    console.error(e);
    const disconnectError = new Error();
    disconnectError.status = INTERNET_DISCONNECTED_ERROR;
    throw disconnectError;
  }
};

const addScores = async (data) => {
  const url = `${BASE_URL}${SCORES_ENDPOINT}`;
  return await makeRequest(url, "POST", data);
};

const getScores = async () => {
  const url = `${BASE_URL}${SCORES_ENDPOINT}`;
  return await makeRequest(url);
};

export { addScores, getScores };
