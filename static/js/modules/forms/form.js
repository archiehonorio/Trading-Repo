// modules/form/form.js
export function initializeFormControls() {
  // Your existing form.js code here
  const slider = document.querySelector(".slider");
  const walletBalance = document.querySelector(".balance-amount");

  slider.addEventListener("input", function () {
    const percentage = this.value;
    const maxAmount = parseFloat(walletBalance.textContent.split(" ")[0]);
    const calculatedAmount = (maxAmount * percentage) / 100;
    document.querySelectorAll(".form-input")[1].value =
      calculatedAmount.toFixed(4);
  });

  document.querySelectorAll(".toggle-btn").forEach((button) => {
    button.addEventListener("click", function () {
      document
        .querySelectorAll(".toggle-btn")
        .forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");
    });
  });
}
