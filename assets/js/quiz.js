import { QUIZ } from "./data.js";

const STORAGE_KEY = "pcb-studio-quiz-v1";

function readBest() {
  try {
    return Math.max(0, Math.min(QUIZ.length, Number(localStorage.getItem(STORAGE_KEY)) || 0));
  } catch {
    return 0;
  }
}

function writeBest(score) {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    /* storage can be unavailable in private mode */
  }
}

export function initQuiz() {
  const content = document.getElementById("quiz-content");
  if (!content) return;

  const bestElement = document.getElementById("quiz-best");
  const currentElement = document.getElementById("quiz-current");
  let best = readBest();
  let index = 0;
  let score = 0;
  let answered = false;

  if (bestElement) bestElement.textContent = `${best} / ${QUIZ.length}`;

  function updateCurrent() {
    if (currentElement) currentElement.textContent = `${score} / ${QUIZ.length}`;
  }

  function renderQuestion() {
    answered = false;
    const item = QUIZ[index];
    content.innerHTML = "";

    const meta = document.createElement("div");
    meta.className = "quiz-meta";
    meta.innerHTML = `<span>Question ${String(index + 1).padStart(2, "0")} / ${QUIZ.length}</span><span>${item.level}</span>`;

    const progress = document.createElement("div");
    progress.className = "quiz-progress";
    progress.setAttribute("aria-hidden", "true");
    const progressFill = document.createElement("span");
    progressFill.style.width = `${(index / QUIZ.length) * 100}%`;
    progress.append(progressFill);

    const question = document.createElement("h3");
    question.className = "quiz-question";
    question.textContent = item.question;

    const options = document.createElement("div");
    options.className = "quiz-options";

    item.options.forEach((option, optionIndex) => {
      const button = document.createElement("button");
      button.className = "quiz-option";
      button.type = "button";
      button.innerHTML = `<span class="letter">${String.fromCharCode(65 + optionIndex)}</span><span>${option}</span>`;
      button.addEventListener("click", () => choose(optionIndex, options, feedback, nextButton));
      options.append(button);
    });

    const feedback = document.createElement("div");
    feedback.className = "quiz-feedback";
    feedback.id = "quiz-feedback";
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");

    const footer = document.createElement("div");
    footer.className = "quiz-footer";
    const note = document.createElement("span");
    note.style.color = "var(--dim)";
    note.style.fontSize = "11px";
    note.textContent = "Pick one answer. The explanation appears immediately.";
    const nextButton = document.createElement("button");
    nextButton.className = "btn btn-primary btn-small";
    nextButton.type = "button";
    nextButton.textContent = index === QUIZ.length - 1 ? "See result" : "Next question";
    nextButton.hidden = true;
    nextButton.addEventListener("click", () => {
      index += 1;
      if (index >= QUIZ.length) {
        renderResult();
      } else {
        renderQuestion();
      }
    });
    footer.append(note, nextButton);

    content.append(meta, progress, question, options, feedback, footer);
    updateCurrent();
  }

  function choose(choice, options, feedback, nextButton) {
    if (answered) return;
    answered = true;
    const item = QUIZ[index];
    const buttons = [...options.querySelectorAll(".quiz-option")];
    buttons.forEach((button, buttonIndex) => {
      button.disabled = true;
      if (buttonIndex === item.answer) button.classList.add("is-correct");
      if (buttonIndex === choice && choice !== item.answer) button.classList.add("is-wrong");
    });
    if (choice === item.answer) {
      score += 1;
      feedback.innerHTML = `<strong>Correct.</strong> ${item.explain}`;
    } else {
      feedback.innerHTML = `<strong>Not quite.</strong> ${item.explain}`;
    }
    updateCurrent();
    nextButton.hidden = false;
    nextButton.focus();
  }

  function renderResult() {
    if (score > best) {
      best = score;
      writeBest(best);
      if (bestElement) bestElement.textContent = `${best} / ${QUIZ.length}`;
    }
    let title = "Worth another pass";
    let copy = "Open the concept cards, follow the return path, and try again. The explanation trail is the point.";
    if (score === QUIZ.length) {
      title = "Clean sweep";
      copy = "You can explain the board, the power tree, and the return path. Now do it on a real design review.";
    } else if (score >= 8) {
      title = "Strong foundations";
      copy = "You have the vocabulary and the instincts. The next step is applying it under real constraints.";
    } else if (score >= 6) {
      title = "Good start";
      copy = "The core ideas are landing. Review the cards you missed, then run the quiz again.";
    }
    content.innerHTML = `
      <div class="quiz-result">
        <span class="badge">Run complete</span>
        <h3>${title}</h3>
        <p>${copy}</p>
        <div class="score-line">${score}<small> / ${QUIZ.length}</small></div>
        <div class="result-actions">
          <button class="btn btn-primary btn-small" type="button" id="quiz-restart">Try again</button>
          <a class="btn btn-small" href="#learn">Review the cards</a>
        </div>
      </div>`;
    updateCurrent();
    const restart = document.getElementById("quiz-restart");
    restart?.addEventListener("click", () => {
      index = 0;
      score = 0;
      updateCurrent();
      renderQuestion();
    });
  }

  renderQuestion();
}
