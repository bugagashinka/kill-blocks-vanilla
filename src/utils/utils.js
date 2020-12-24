const getRandom = (min, max) => Math.random() * (max - min) + min;

const getMagnitude = (point0 = { x: 0, y: 0 }, point1 = { x: 0, y: 0 }) => {
  return Math.sqrt(Math.pow(point0.x - point1.x, 2) + Math.pow(point0.y - point1.y, 2));
};

const removeHashURI = () => {
  const [originURI] = window.location.href.split("#");
  window.history.replaceState(null, null, originURI);
};

const getRandomColor = () => `rgb(${getRandom(0, 255)}, ${getRandom(0, 255)}, ${getRandom(0, 255)})`;

export { getMagnitude, getRandom, removeHashURI, getRandomColor };
