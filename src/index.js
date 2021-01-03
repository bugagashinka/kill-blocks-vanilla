import { GAME_START_TIME, GAME_END_TIME, TIME_PER_FRAME, DEFAULT_PLAYER_NAME } from "@/utils/constants";
import {
  BLOCK_SIZE,
  BLOCK_CLICK_COLOR,
  DELAY_MIN_TIME,
  DELAY_MAX_TIME,
  LIFE_MIN_TIME,
  LIFE_MAX_TIME,
  BLOCK_POOL_SIZE,
  MAX_CELL_CONTENT,
} from "@/utils/constants";

import "bootstrap/dist/js/bootstrap.min.js";
import $ from "jquery";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/index.scss";
import "./assets/fonts/Roboto-Regular.ttf";
import { getMagnitude, getRandom, getRandomColor } from "@/utils";
import { addScores, getScores } from "./services/restService";

(function (global) {
  // small: 0-15, middle: 16-50, large: 51-100
  const blockRandomWeight = [15, 50, 100];

  const blockTypes = [
    { points: 3, scaleRatio: 4 },
    { points: 2, scaleRatio: 2 },
    { points: 1, scaleRatio: 1 },
  ];
  const document = global.document;
  const window = global.window;

  //  UI elements
  let stageElement,
    alertElement$,
    timerElement,
    scoreElement,
    tableElement,
    replayButton,
    toggleGameButton,
    modalWindow$,
    modalScore$;

  // State
  let isActiveGame = false;
  let currentTime = GAME_START_TIME;
  let score = 0;
  let stageSize = [320, 240];
  let blockPool = [];

  //   -------------- Timer -----------------
  function updateTimer() {
    if (!isActiveGame) return;

    currentTime -= 1;

    if (currentTime < GAME_END_TIME) {
      currentTime = GAME_END_TIME;
      gameOver();
    }
    timerElement.textContent = currentTime;
  }

  function resetTimer() {
    currentTime = GAME_START_TIME;
    timerElement.textContent = currentTime;
  }

  function initTimer() {
    setInterval(updateTimer, 1000);
  }
  // ---------------------------------------

  //   -------------- Game Engine -----------------

  function gameLoop() {
    updateBlocks();
  }

  function gameOver() {
    modalScore$.text(score);
    modalWindow$.modal("show");
    modalWindow$.on("hide.bs.modal", () => {
      resetGame();
      toggleGameButton.textContent = "Play";
      isActiveGame = false;
    });
  }

  function resetGame() {
    isActiveGame = true;
    resetTimer();
    score = 0;
    scoreElement.textContent = 0;
    stageElement.innerHTML = "";
    blockPool = [];
    toggleGameButton.textContent = "Pause";
  }
  //   --------------------------------------------

  // ----------------- UI ------------------
  function showAlert(error) {
    alertElement$.find(".alert-content").text(error.message);
    alertElement$.show();
  }

  function addScore(value) {
    score += value;
    scoreElement.textContent = score;
  }

  const generateSpawnPos = (scaleRatio) => {
    const blockSize = BLOCK_SIZE / scaleRatio;
    let inCheck = true;
    let attemptsCount = 20;
    let x, y;
    do {
      const [width, height] = stageSize;
      [x, y] = [getRandom(0, width - blockSize), getRandom(0, height - blockSize)];
      inCheck = blockPool.some(({ pos }) => getMagnitude(pos, { x, y }) < BLOCK_SIZE * 1.5);
    } while (inCheck && --attemptsCount);
    return { x, y };
  };

  function createBlock() {
    const [delay, lifeTime] = [getRandom(DELAY_MIN_TIME, DELAY_MAX_TIME), getRandom(LIFE_MIN_TIME, LIFE_MAX_TIME)];
    const blockWeight = getRandom(0, 100);
    const blockTypeIndex = blockRandomWeight.findIndex((weightGroup) => blockWeight <= weightGroup);
    const { points, scaleRatio } = blockTypes[blockTypeIndex];

    const blockModel = {
      points,
      color: getRandomColor(),
      scaleRatio,
      pos: generateSpawnPos(scaleRatio, BLOCK_SIZE),
      delay,
      lifeTime,
    };

    const scoreText = document.createElement("span");
    scoreText.classList.add("dice__points");
    scoreText.textContent = `+${blockModel.points}`;

    const blockElement = document.createElement("div");
    blockElement.classList.add("dice", "dice_appear");
    Object.assign(blockElement.style, {
      backgroundColor: blockModel.color,
      left: `${blockModel.pos.x}px`,
      top: `${blockModel.pos.y}px`,
      width: `${BLOCK_SIZE / scaleRatio}px`,
      height: `${BLOCK_SIZE / scaleRatio}px`,
      animationPlayState: "running",
    });
    blockElement.appendChild(scoreText);

    return {
      ...blockModel,
      element: blockElement,
    };
  }

  function blockClickHandler(targetBlockElement) {
    if (targetBlockElement.classList.contains("dice_disappear")) return;

    const { points } = blockPool.find(({ element }) => element === targetBlockElement);
    addScore(points);
    targetBlockElement.style.backgroundColor = BLOCK_CLICK_COLOR;
    targetBlockElement.classList.add("dice_disappear");
    targetBlockElement.firstElementChild.classList.add("dice__points_show");
  }

  function createBlocks() {
    const displayedBlockCount = blockPool.length;

    if (displayedBlockCount < BLOCK_POOL_SIZE) {
      Array(BLOCK_POOL_SIZE - displayedBlockCount)
        .fill(null)
        .forEach(() => {
          blockPool.push(createBlock());
        });
    }
  }

  function updateBlocks() {
    if (isActiveGame) {
      createBlocks();
    }

    blockPool = blockPool.filter((blockModel) => {
      const { element } = blockModel;

      //   Pause/resume block animation
      if (!isActiveGame) {
        element.style.animationPlayState = "paused";
        return true;
      } else {
        element.style.animationPlayState = "running";
      }

      if (!stageElement.contains(element)) {
        //   Spawn new block withstanding the delay
        blockModel.delay -= TIME_PER_FRAME;
        if (blockModel.delay <= 0) {
          stageElement.appendChild(element);
        }
      } else {
        // Check block lifetime and destroy if expired
        blockModel.lifeTime -= TIME_PER_FRAME;
        if (blockModel.lifeTime <= 0) {
          element.classList.add("dice_disappear");
          element.addEventListener("animationend", function handler(e) {
            element.remove(element);
            e.currentTarget.removeEventListener(e.type, handler);
          });
          return false;
        }
      }
      return true;
    });
  }

  const windowResizeHandler = () => {
    stageSize = [stageElement.clientWidth, stageElement.clientHeight];
  };

  function populateTable(scoreList) {
    const tableRows = scoreList.map(({ name, score }) => {
      const row = document.createElement("tr");
      const nameCell = document.createElement("td");
      nameCell.textContent = name.length > MAX_CELL_CONTENT ? `${name.slice(0, MAX_CELL_CONTENT)}...` : name;
      const scoreCell = document.createElement("td");
      scoreCell.textContent = score;
      row.append(nameCell, scoreCell);
      return row;
    });
    tableElement.innerHTML = "";
    tableElement.append(...tableRows);
  }

  function initUI() {
    stageElement = document.getElementById("stage");
    timerElement = document.getElementById("timer");
    scoreElement = document.getElementById("score");
    tableElement = document.getElementById("score-table-body");
    replayButton = document.getElementById("replay-btn");
    toggleGameButton = document.getElementById("toggle-game-btn");
    modalWindow$ = $("#modal-window");
    modalScore$ = modalWindow$.find(".modal__score-value");
    alertElement$ = $("#alert");
    alertElement$.on("close.bs.alert", function () {
      alertElement$.hide();
      return false;
    });
    alertElement$.hide();

    //  Window resize handler
    window.addEventListener("resize", windowResizeHandler);
    windowResizeHandler();

    // Dashboard
    resetTimer();
    scoreElement.textContent = score;

    replayButton.addEventListener("click", resetGame);
    toggleGameButton.addEventListener("click", ({ currentTarget }) => {
      currentTarget.textContent = currentTarget.textContent == "Play" ? "Pause" : "Play";
      isActiveGame = !isActiveGame;
    });

    // Stage
    [stageElement.style.width, stageElement.style.height] = stageSize;
    stageElement.addEventListener("click", ({ target }) => {
      if (!target.classList.contains("dice") || !isActiveGame) return;
      blockClickHandler(target);
    });

    // Scores table
    getScores()
      .then((scores) => populateTable(scores))
      .catch(showAlert);

    // Modal window
    modalWindow$.modal({
      keyboard: false,
      show: false,
    });
    modalScore$.text(score);
    modalWindow$.find(".modal__ok-btn").on("click", () => {
      const inputName = modalWindow$.find(".modal__input").val().trim();
      const name = inputName ? inputName : DEFAULT_PLAYER_NAME;
      const newScore = { name, score };
      addScores(newScore)
        .then((scores) => populateTable(scores))
        .catch(showAlert);
      modalWindow$.modal("hide");
    });
  }
  // ---------------------------------------

  const init = () => {
    initUI();
    initTimer();
    setInterval(gameLoop, TIME_PER_FRAME);
  };

  document.addEventListener("DOMContentLoaded", init);
})(window);
