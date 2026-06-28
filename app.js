document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('emi-form');
  const resultsPlaceholder = document.getElementById('results-placeholder-view');
  const resultsContent = document.getElementById('results-content-view');
  
  // Summary outputs
  const summaryEmi = document.getElementById('summary-emi');
  const summaryPrincipal = document.getElementById('summary-principal');
  const summaryInterest = document.getElementById('summary-interest');
  const summaryTotal = document.getElementById('summary-total');
  
  // Buttons
  const btnCalculate = document.getElementById('btn-calculate');
  const btnReset = document.getElementById('btn-reset');
  const btnExportExcel = document.getElementById('btn-export-excel');
  const loanAmountInput = document.getElementById('loan-amount');
  const amountWordsDisplay = document.getElementById('amount-words');
  
  let currentSchedule = [];
  
  // Scale text handlers
  let textScale = 1.0;
  const scaleStep = 0.1;
  const minScale = 0.8;
  const maxScale = 1.6;

  const updateTextScale = () => {
    document.documentElement.style.setProperty('--text-scale', textScale);
  };

  document.getElementById('btn-scale-increase').addEventListener('click', () => {
    if (textScale < maxScale) {
      textScale = parseFloat((textScale + scaleStep).toFixed(1));
      updateTextScale();
    }
  });

  document.getElementById('btn-scale-decrease').addEventListener('click', () => {
    if (textScale > minScale) {
      textScale = parseFloat((textScale - scaleStep).toFixed(1));
      updateTextScale();
    }
  });

  document.getElementById('btn-scale-reset').addEventListener('click', () => {
    textScale = 1.0;
    updateTextScale();
  });

  // Currency Formatter helper
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Number to Indian Words converter (Lakhs and Crores)
  const numberToIndianWords = (num) => {
    if (isNaN(num) || num <= 0) return "";
    if (num > 1000000000) return "Amount exceeds limit (100 Crores)";

    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", 
                   "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const convertLessThanOneThousand = (n) => {
      if (n === 0) return "";
      let str = "";
      if (n >= 100) {
        str += ones[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
      }
      if (n >= 20) {
        str += tens[Math.floor(n / 10)] + " ";
        n %= 10;
      }
      if (n > 0) {
        str += ones[n] + " ";
      }
      return str.trim();
    };

    let temp = Math.floor(num);
    let crore = Math.floor(temp / 10000000);
    temp %= 10000000;
    let lakh = Math.floor(temp / 100000);
    temp %= 100000;
    let thousand = Math.floor(temp / 1000);
    temp %= 1000;
    let hundred = temp;

    let result = "";
    if (crore > 0) {
      result += convertLessThanOneThousand(crore) + " Crore ";
    }
    if (lakh > 0) {
      result += convertLessThanOneThousand(lakh) + " Lakh ";
    }
    if (thousand > 0) {
      result += convertLessThanOneThousand(thousand) + " Thousand ";
    }
    if (hundred > 0) {
      result += convertLessThanOneThousand(hundred) + " ";
    }

    return result.trim() + " Rupees Only";
  };

  // Sync aria-invalid with the CSS :user-invalid state
  const syncAria = (el) => {
    if (el && el.setAttribute) {
      // Small timeout to allow browser to calculate :user-invalid state
      setTimeout(() => {
        el.setAttribute('aria-invalid', el.matches(':user-invalid') ? 'true' : 'false');
      }, 50);
    }
  };

  // Sync invalid states on blur and input events
  form.addEventListener('blur', (e) => {
    if (e.target.tagName === 'INPUT') {
      syncAria(e.target);
    }
  }, true);

  form.addEventListener('input', (e) => {
    if (e.target.tagName === 'INPUT') {
      // Clear error as typing continues (resets to neutral)
      if (e.target.hasAttribute('aria-invalid')) {
        syncAria(e.target);
      }
    }
  });

  // Dynamic Indian Terms number words display on input
  loanAmountInput.addEventListener('input', () => {
    const val = parseFloat(loanAmountInput.value);
    if (!isNaN(val) && val > 0) {
      amountWordsDisplay.textContent = numberToIndianWords(val);
    } else {
      amountWordsDisplay.textContent = "";
    }
  });

  // Dynamic duration validation limits based on unit choice
  const durationInput = document.getElementById('loan-duration');
  const durationHelper = document.getElementById('duration-helper');
  const durationError = document.getElementById('duration-error');
  const durationRadios = document.querySelectorAll('input[name="duration-unit"]');

  const updateDurationLimits = () => {
    const selectedUnit = form.querySelector('input[name="duration-unit"]:checked').value;
    if (selectedUnit === 'years') {
      durationInput.max = '40';
      durationInput.placeholder = 'e.g. 5';
      durationHelper.textContent = 'Enter the duration of the loan in years (1 to 40).';
      durationError.innerHTML = '<span aria-hidden="true">❌</span> Please enter a valid duration between 1 and 40 years.';
    } else {
      durationInput.max = '480';
      durationInput.placeholder = 'e.g. 60';
      durationHelper.textContent = 'Enter the duration of the loan in months (1 to 480).';
      durationError.innerHTML = '<span aria-hidden="true">❌</span> Please enter a valid duration between 1 and 480 months.';
    }
    // Revalidate if there is already a value
    if (durationInput.value) {
      syncAria(durationInput);
    }
  };

  durationRadios.forEach(radio => {
    radio.addEventListener('change', updateDurationLimits);
  });

  // Run once on load to initialize limits
  updateDurationLimits();

  // Calculator Logic
  const calculateEMI = () => {
    const loanAmountInput = document.getElementById('loan-amount');
    const interestRateInput = document.getElementById('interest-rate');
    const loanDurationInput = document.getElementById('loan-duration');
    const durationUnit = form.querySelector('input[name="duration-unit"]:checked').value;
    const startDateVal = document.getElementById('start-date').value;

    const principal = parseFloat(loanAmountInput.value);
    const annualInterestRate = parseFloat(interestRateInput.value);
    const durationInput = parseFloat(loanDurationInput.value);

    // Validate parsing
    if (isNaN(principal) || isNaN(annualInterestRate) || isNaN(durationInput)) return;

    // Convert duration to months
    const totalMonths = durationUnit === 'years' ? durationInput * 12 : durationInput;
    
    // Monthly interest rate
    const monthlyRate = annualInterestRate / 12 / 100;

    let emi = 0;
    if (monthlyRate === 0) {
      emi = principal / totalMonths;
    } else {
      emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
            (Math.pow(1 + monthlyRate, totalMonths) - 1);
    }

    // Generate amortization schedule breakdown
    let remainingPrincipal = principal;
    let totalInterestPaid = 0;
    const schedule = [];

    // Parse start date
    let startYear, startMonthIndex;
    if (startDateVal) {
      const parts = startDateVal.split('-');
      startYear = parseInt(parts[0], 10);
      startMonthIndex = parseInt(parts[1], 10) - 1; // 0-indexed
    }

    for (let month = 1; month <= totalMonths; month++) {
      let interestPaidForMonth = remainingPrincipal * monthlyRate;
      let principalPaidForMonth = emi - interestPaidForMonth;
      let actualEmiForMonth = emi;

      // Correct for the last month's rounding errors
      if (month === totalMonths) {
        principalPaidForMonth = remainingPrincipal;
        interestPaidForMonth = remainingPrincipal * monthlyRate;
        actualEmiForMonth = principalPaidForMonth + interestPaidForMonth;
        remainingPrincipal = 0;
      } else {
        remainingPrincipal -= principalPaidForMonth;
        if (remainingPrincipal < 0) remainingPrincipal = 0;
      }

      totalInterestPaid += interestPaidForMonth;

      // Label calculation
      let label = `Month ${month}`;
      if (startDateVal) {
        const currentDate = new Date(startYear, startMonthIndex + (month - 1), 1);
        label = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }

      schedule.push({
        label: label,
        principalPaid: principalPaidForMonth,
        interestPaid: interestPaidForMonth,
        totalPayment: actualEmiForMonth,
        remainingPrincipal: remainingPrincipal
      });
    }

    const totalPayable = principal + totalInterestPaid;

    // Render Summary Numbers
    summaryEmi.textContent = formatCurrency(emi);
    summaryPrincipal.textContent = formatCurrency(principal);
    summaryInterest.textContent = formatCurrency(totalInterestPaid);
    summaryTotal.textContent = formatCurrency(totalPayable);

    // Show Results Card
    resultsPlaceholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    // Render Table Breakdown
    currentSchedule = schedule;
    renderTable(schedule);
    
    // Show Excel export button
    btnExportExcel.classList.remove('hidden');
    
    // Smooth scroll down to calculation results on mobile
    if (window.innerWidth < 900) {
      resultsContent.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const renderTable = (schedule) => {
    const container = document.getElementById('breakdown-table-container');
    if (schedule.length === 0) {
      container.innerHTML = `
        <div class="table-placeholder">
          <p>No breakdown details available. Please calculate your EMI first.</p>
        </div>
      `;
      return;
    }

    let tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th class="num-col">EMI Amount</th>
            <th class="num-col">Interest Paid</th>
            <th class="num-col">Principal Paid</th>
            <th class="num-col">Remaining Principal</th>
          </tr>
        </thead>
        <tbody>
    `;

    schedule.forEach((row) => {
      tableHtml += `
        <tr>
          <td data-label="Month">${row.label}</td>
          <td data-label="EMI Amount" class="num-col">${formatCurrency(row.totalPayment)}</td>
          <td data-label="Interest Paid" class="num-col">${formatCurrency(row.interestPaid)}</td>
          <td data-label="Principal Paid" class="num-col">${formatCurrency(row.principalPaid)}</td>
          <td data-label="Remaining Principal" class="num-col">${formatCurrency(row.remainingPrincipal)}</td>
        </tr>
      `;
    });

    tableHtml += `
        </tbody>
      </table>
    `;

    container.innerHTML = tableHtml;
  };

  // Form submit handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Force validation triggers so :user-invalid matches immediately
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
      // Trigger validation checks
      input.dispatchEvent(new Event('blur'));
      syncAria(input);
    });

    // Check if form is valid
    if (!form.checkValidity()) {
      const firstInvalid = form.querySelector('input:invalid');
      if (firstInvalid) {
        firstInvalid.focus();
      }
      return;
    }

    // Process loan calculations
    calculateEMI();
  });

  // Reset form handler
  btnReset.addEventListener('click', () => {
    form.reset();
    updateDurationLimits();
    
    // Reset buffer and hide export
    currentSchedule = [];
    btnExportExcel.classList.add('hidden');
    amountWordsDisplay.textContent = "";
    
    // Hide results & show placeholders
    resultsContent.classList.add('hidden');
    resultsPlaceholder.classList.remove('hidden');
    renderTable([]);

    // Clear validation attributes
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
      input.removeAttribute('aria-invalid');
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Export to Excel handler (CSV format with UTF-8 BOM for cross-platform compatibility)
  btnExportExcel.addEventListener('click', () => {
    if (currentSchedule.length === 0) return;

    // Table Headers
    const headers = ["Month", "EMI Amount (INR)", "Interest Paid (INR)", "Principal Paid (INR)", "Remaining Principal (INR)"];

    // Format rows with escaping for special characters (like quotes)
    const rows = currentSchedule.map(row => [
      `"${row.label.replace(/"/g, '""')}"`,
      `"${row.totalPayment.toFixed(2)}"`,
      `"${row.interestPaid.toFixed(2)}"`,
      `"${row.principalPaid.toFixed(2)}"`,
      `"${row.remainingPrincipal.toFixed(2)}"`
    ]);

    // Combine headers and rows
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

    // Create file blob with UTF-8 BOM (\uFEFF) to make Excel parse currency/dates natively
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EMI_Breakdown_${Date.now()}.csv`;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
});
