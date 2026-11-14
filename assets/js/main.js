const stageLab = document.getElementById("lab-stage");
const stageGame = document.getElementById("game-stage");
const quizContent = document.getElementById("quiz-content");

function showLabFallback() {
  if (stageLab) stageLab.classList.add("no-webgl");
}

function showGameFallback() {
  if (stageGame) stageGame.classList.add("no-webgl");
}

function showQuizFallback() {
  if (!quizContent) return;
  quizContent.textContent =
    "The quiz could not start in this browser. The concept cards above and the Python reports below still work.";
}

async function load(path, name, onError) {
  try {
    const module = await import(path);
    if (typeof module[name] !== "function") {
      throw new Error(`${path} does not export ${name}()`);
    }
    await module[name]();
  } catch (error) {
    console.error(`[PCB Design Studio] ${path}`, error);
    if (onError) onError(error);
  }
}

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return Boolean(context);
  } catch {
    return false;
  }
}

async function start() {
  const webgl = hasWebGL();
  if (!webgl) showLabFallback();

  await Promise.all([
    load("./site.js", "initSite"),
    load("./quiz.js", "initQuiz", showQuizFallback),
    load("./game.js", "initGame", showGameFallback),
    webgl ? load("./lab.js", "initLab", showLabFallback) : Promise.resolve(),
  ]);
}

start();
