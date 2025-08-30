import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Calendar, Clock, Download, Upload, Check, X, DollarSign, FileText, BarChart3, CreditCard, Receipt, Calculator, Filter, Eye, MoreVertical, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const Payroll = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("salary");
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [payrollData, setPayrollData] = useState([]);
  const [notification, setNotification] = useState(null);
  const [filters, setFilters] = useState({
    department: "",
    status: "",
    employmentType: "",
    location: "",
  });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [hoveredDeduction, setHoveredDeduction] = useState(null);
  const [payFrequency, setPayFrequency] = useState("Monthly");
  const [customDays, setCustomDays] = useState(1);
  const [selectedEmployeeForPayslip, setSelectedEmployeeForPayslip] =
    useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [showEarningOptions, setShowEarningOptions] = useState(false);
  const [showDeductionOptions, setShowDeductionOptions] = useState(false);
  const [customEarnings, setCustomEarnings] = useState([]);
  const [customDeductions, setCustomDeductions] = useState([]);
  const [showNewPayrollModal, setShowNewPayrollModal] = useState(false);
  const [employeesList, setEmployeesList] = useState([]);
  const [newPayrollData, setNewPayrollData] = useState({
    employeeId: "",
    employeeName: "",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    basic: 0,
    lta: 0,
    bonus: 0,
    otherAllowances: 0,
    overtime: 0,
    gross: 0,
    pf: 0,
    loan: 0,
    otherDeductions: 0,
    totalDeductions: 0,
    net: 0,
    status: "draft",
    payDate: new Date().toISOString().slice(0, 10),
  });

  // Earning and deduction options
  const earningOptions = [
    { id: "lta", label: "Leave Travel Allowance", default: 0 },
    { id: "bonus", label: "Bonus", default: 0 },
    { id: "overtime", label: "Overtime", default: 0 },
  ];

  const deductionOptions = [
    { id: "incomeTax", label: "Loan", default: 0 },
    { id: "professionalTax", label: "Professional Tax", default: 0 },
  ];

  // Simple notification system to replace toast
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Calculate salary based on pay frequency
  const calculateSalaryByFrequency = (
    baseSalary,
    frequency,
    days = 1,
    isDeduction = false
  ) => {
    // For deductions, only PF should be calculated based on frequency
    if (isDeduction && frequency !== "Custom") {
      return baseSalary;
    }

    switch (frequency) {
      case "Hourly":
        return baseSalary / (30 * 8);
      case "Daily":
        return baseSalary / 30;
      case "Weekly":
        return baseSalary / 4;
      case "Custom":
        return (baseSalary / 30) * days;
      case "Monthly":
      default:
        return baseSalary;
    }
  };

  // Add a custom earning
  const addCustomEarning = (option) => {
    if (!customEarnings.find((earning) => earning.id === option.id)) {
      setCustomEarnings([
        ...customEarnings,
        { ...option, value: option.default },
      ]);
      setShowEarningOptions(false);
      showNotification(`${option.label} added to earnings`);
    }
  };

  // Add a custom deduction
  const addCustomDeduction = (option) => {
    if (!customDeductions.find((deduction) => deduction.id === option.id)) {
      setCustomDeductions([
        ...customDeductions,
        { ...option, value: option.default },
      ]);
      setShowDeductionOptions(false);
      showNotification(`${option.label} added to deductions`);
    }
  };

  // Update custom earning value
  const updateCustomEarning = (id, value) => {
    setCustomEarnings(
      customEarnings.map((earning) =>
        earning.id === id
          ? { ...earning, value: parseFloat(value) || 0 }
          : earning
      )
    );
  };

  // Update custom deduction value
  const updateCustomDeduction = (id, value) => {
    setCustomDeductions(
      customDeductions.map((deduction) =>
        deduction.id === id
          ? { ...deduction, value: parseFloat(value) || 0 }
          : deduction
      )
    );
  };

  // Remove custom earning
  const removeCustomEarning = (id) => {
    setCustomEarnings(customEarnings.filter((earning) => earning.id !== id));
  };

  // Remove custom deduction
  const removeCustomDeduction = (id) => {
    setCustomDeductions(
      customDeductions.filter((deduction) => deduction.id !== id)
    );
  };

useEffect(() => {
  const fetchEmployeeData = async () => {
    try {
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbyWlc2CfrDgr1JGsJHl1N4nRf-GAR-m6yqPPuP8Oggcafv3jo4thFrhfAX2vnfSzLQLlg/exec?sheet=JOINING&action=fetch"
      );
      const data = await response.json();

      if (data && data.success && data.data) {
        // Use row 6 (index 6) as header
        const headers = data.data[6];
        // Start actual rows from row 7 (index 7)
        const rows = data.data.slice(6);

        // Map column names to indices
        const columnMap = {};
        headers.forEach((header, index) => {
          columnMap[header.trim().toLowerCase()] = index;
        });

        // Extract Employee ID (Column B → index 1) and Employee Name (Column C → index 2)
        const employeeData = rows.map((row) => ({
          employeeId: row[1] || "", // Column B
          employeeName: row[4] || "", // Column E
        }));

        setEmployeesList(employeeData);
      }
    } catch (error) {
      console.error("Failed to fetch employee data:", error);
      showNotification("Failed to load employee data", "error");
    }
  };

  fetchEmployeeData();
}, []);


const handleEmployeeSelect = (employeeName) => {
  const selectedEmployee = employeesList.find(emp => emp.employeeName === employeeName);
  if (selectedEmployee) {
    setNewPayrollData({
      ...newPayrollData,
      employeeName: selectedEmployee.employeeName,
      employeeId: selectedEmployee.employeeId
    });
  }
};

  // Fetch data from Google Sheets
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch data from Google Sheets using the provided AppScript URL
        const response = await fetch(
          "https://script.google.com/macros/s/AKfycbyWlc2CfrDgr1JGsJHl1N4nRf-GAR-m6yqPPuP8Oggcafv3jo4thFrhfAX2vnfSzLQLlg/exec?sheet=Salary&action=fetch"
        );
        const data = await response.json();

        if (data && data.success && data.data) {
          // Extract headers and data rows
          const headers = data.data[0];
          const rows = data.data.slice(1);

          // Map column names to indices
          const columnMap = {};
          headers.forEach((header, index) => {
            columnMap[header.trim().toLowerCase()] = index;
          });

          // Transform the data to match our structure
          const transformedData = rows.map((row) => ({
            employeeId: row[1] || "",
            employeeName: row[2] || "",
            year: row[columnMap["year"]] || "",
            month: row[columnMap["month"]] || "",
            basic: parseFloat(row[columnMap["basic salary"]]) || 0,
            lta: parseFloat(row[columnMap["leave travel allowance"]]) || 0,
            bonus: parseFloat(row[columnMap["bonus"]]) || 0,
            otherAllowances: parseFloat(row[columnMap["other allowance"]]) || 0,
            overtime: parseFloat(row[columnMap["overtime"]]) || 0,
            gross: parseFloat(row[columnMap["gross salary"]]) || 0,
            pf: parseFloat(row[columnMap["pf"]]) || 0,
            loan: parseFloat(row[columnMap["loan"]]) || 0,
            otherDeductions: parseFloat(row[columnMap["other deduction"]]) || 0,
            totalDeductions: parseFloat(row[columnMap["total deduction"]]) || 0,
            net: parseFloat(row[columnMap["net salary"]]) || 0,
            status: row[columnMap["status"]] || "",
            payDate: row[columnMap["pay date"]] || "",
          }));

          setPayrollData(transformedData);

          // Create employees list from the payroll data
          const uniqueEmployees = transformedData.reduce((acc, item) => {
            if (!acc.find((e) => e.employeeId === item.employeeId)) {
              acc.push({
                employeeId: item.employeeId,
                employeeName: item.employeeName,
                designation: "", // Not available in the sheet
                department: "", // Not available in the sheet
                status: "active",
              });
            }
            return acc;
          }, []);

          setEmployees(uniqueEmployees);
        } else {
          throw new Error(data.error || "Failed to fetch data");
        }
      } catch (error) {
        setError(error.message);
        showNotification(`Failed to load data: ${error.message}`, "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

const handleSubmitNewPayroll = async () => {
  try {
    setLoading(true);

    // Calculate gross, total deductions, and net
    const gross =
      newPayrollData.basic +
      newPayrollData.lta +
      newPayrollData.bonus +
      newPayrollData.otherAllowances +
      newPayrollData.overtime;

    const totalDeductions =
      newPayrollData.pf +
      newPayrollData.loan +
      newPayrollData.otherDeductions;

    const net = gross - totalDeductions;

    const payrollWithCalculations = {
      ...newPayrollData,
      gross,
      totalDeductions,
      net,
    };

    // Prepare data for Google Sheets
    const sheetData = [
      payrollWithCalculations.employeeId,
      payrollWithCalculations.employeeName,
      payrollWithCalculations.year,
      payrollWithCalculations.month,
      payrollWithCalculations.basic,
      payrollWithCalculations.lta,
      payrollWithCalculations.bonus,
      payrollWithCalculations.otherAllowances,
      payrollWithCalculations.overtime,
      payrollWithCalculations.gross,
      payrollWithCalculations.pf,
      payrollWithCalculations.loan,
      payrollWithCalculations.otherDeductions,
      payrollWithCalculations.totalDeductions,
      payrollWithCalculations.net,
      payrollWithCalculations.status,
      payrollWithCalculations.payDate,
    ];

    // Create a form data approach to avoid CORS preflight
    const formData = new URLSearchParams();
    formData.append('sheet', 'Salary');
    formData.append('action', 'append');
    formData.append('rowData', JSON.stringify(sheetData));

    // Use a proxy or direct URL with different approach
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbyWlc2CfrDgr1JGsJHl1N4nRf-GAR-m6yqPPuP8Oggcafv3jo4thFrhfAX2vnfSzLQLlg/exec';
    
    // Method 1: Use a GET request instead (if your AppScript supports it)
    const getUrl = `${scriptUrl}?sheet=Salary&action=insert&rowData=${encodeURIComponent(JSON.stringify(sheetData))}`;
    
    try {
      // Try GET approach first
      const response = await fetch(getUrl, {
        method: 'GET',
        mode: 'no-cors' // This might help in some cases
      });
      
      // If GET doesn't work, try POST with form data
      if (!response.ok) {
        const postResponse = await fetch(scriptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
        });
        
        if (!postResponse.ok) {
          throw new Error('Failed to add payroll entry');
        }
      }

      showNotification("Payroll entry added successfully!");
      setShowNewPayrollModal(false);

      // Refresh the data
      const fetchResponse = await fetch(
        "https://script.google.com/macros/s/AKfycbyWlc2CfrDgr1JGsJHl1N4nRf-GAR-m6yqPPuP8Oggcafv3jo4thFrhfAX2vnfSzLQLlg/exec?sheet=Salary&action=fetch"
      );
      const fetchData = await fetchResponse.json();

      if (fetchData && fetchData.success && fetchData.data) {
        const headers = fetchData.data[0];
        const rows = fetchData.data.slice(1);

        const columnMap = {};
        headers.forEach((header, index) => {
          columnMap[header.trim().toLowerCase()] = index;
        });

        const transformedData = rows.map((row) => ({
          employeeId: row[1] || "",
          employeeName: row[2] || "",
          year: row[columnMap["year"]] || "",
          month: row[columnMap["month"]] || "",
          basic: parseFloat(row[columnMap["basic salary"]]) || 0,
          lta: parseFloat(row[columnMap["leave travel allowance"]]) || 0,
          bonus: parseFloat(row[columnMap["bonus"]]) || 0,
          otherAllowances: parseFloat(row[columnMap["other allowance"]]) || 0,
          overtime: parseFloat(row[columnMap["overtime"]]) || 0,
          gross: parseFloat(row[columnMap["gross salary"]]) || 0,
          pf: parseFloat(row[columnMap["pf"]]) || 0,
          loan: parseFloat(row[columnMap["loan"]]) || 0,
          otherDeductions: parseFloat(row[columnMap["other deduction"]]) || 0,
          totalDeductions: parseFloat(row[columnMap["total deduction"]]) || 0,
          net: parseFloat(row[columnMap["net salary"]]) || 0,
          status: row[columnMap["status"]] || "",
          payDate: row[columnMap["pay date"]] || "",
        }));

        setPayrollData(transformedData);
      }
    } catch (error) {
      // If both methods fail, try using a JSONP approach (for GET requests)
      console.error('Both GET and POST failed, trying alternative approach');
      showNotification("Payroll entry might have been added. Please refresh to see changes.", "info");
      setShowNewPayrollModal(false);
    }
  } catch (error) {
    setError(error.message);
    showNotification(
      `Failed to add payroll entry: ${error.message}`,
      "error"
    );
  } finally {
    setLoading(false);
  }
};

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  const handleExport = (format) => {
    showNotification(`Exporting to ${format.toUpperCase()}...`);
    // Export logic would go here
  };

  const handleProcessPayouts = () => {
    showNotification("Processing payouts...");
    // Payout processing logic would go here
  };

  const handleRecalculate = () => {
    showNotification("Recalculating payroll...");
    // Recalculation logic would go here
  };

  const handleValidate = () => {
    showNotification("Validating payroll data...");
    // Validation logic would go here
  };

  const handleViewCTCBreakdown = (employeeId) => {
    const employeeData = payrollData.find(
      (item) => item.employeeId === employeeId
    );
    const employeeInfo = employees.find((e) => e.employeeId === employeeId);

    if (employeeData && employeeInfo) {
      setSelectedEmployee({
        ...employeeData,
        employeeName: employeeInfo.employeeName,
      });
      setActiveTab("salary");
    }
  };

  // Render CTC Breakdown tab with selected employee data
  const renderCTCBreakdown = () => {
    const employeeData = selectedEmployee || payrollData[0];

    const basicSalary = calculateSalaryByFrequency(
      employeeData?.basic || 0,
      payFrequency,
      customDays
    );

    // Other allowances should not change for custom frequency
    const otherAllowances =
      payFrequency === "Custom"
        ? employeeData?.otherAllowances || 0
        : calculateSalaryByFrequency(
            employeeData?.otherAllowances || 0,
            payFrequency,
            customDays
          );

    // Only PF deduction should be calculated for custom frequency
    const pfDeduction = calculateSalaryByFrequency(
      employeeData?.pf || 0,
      payFrequency,
      customDays,
      true // This flag indicates it's a deduction
    );

    // Other deductions should not change for custom frequency
    const otherDeduction =
      payFrequency === "Custom"
        ? employeeData?.otherDeductions || 0
        : calculateSalaryByFrequency(
            employeeData?.otherDeductions || 0,
            payFrequency,
            customDays
          );

    // Calculate total custom earnings
    const totalCustomEarnings = customEarnings.reduce(
      (sum, earning) => sum + earning.value,
      0
    );

    // Calculate total custom deductions
    const totalCustomDeductions = customDeductions.reduce(
      (sum, deduction) => sum + deduction.value,
      0
    );

    const grossSalary = basicSalary + otherAllowances + totalCustomEarnings;
    const totalDeductions =
      pfDeduction + otherDeduction + totalCustomDeductions;
    const netSalary = grossSalary - totalDeductions;

    return (
      <div className="space-y-6">
        {selectedEmployee && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-blue-900">
                Viewing CTC for: {selectedEmployee.employeeName}
              </h3>
              <p className="text-sm text-blue-700">
                Employee ID: {selectedEmployee.employeeId}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white bg-opacity-70 backdrop-blur-md rounded-2xl p-6 border border-gray-200 shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-blue-900">
            Pay Frequency
          </h3>

          {payFrequency === "Custom" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Days
              </label>
              <input
                type="number"
                min="1"
                value={customDays}
                onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                className="w-32 bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-blue-900">Earnings</h4>
                <button
                  onClick={() => setShowEarningOptions(!showEarningOptions)}
                  className="p-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              {showEarningOptions && (
                <div className="bg-gray-50 p-3 rounded-md mb-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    Add Earning:
                  </h5>
                  <div className="grid grid-cols-1 gap-2">
                    {earningOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => addCustomEarning(option)}
                        className="text-left px-3 py-1 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-sm"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {[
                { label: "Basic Pay", value: basicSalary },
                { label: "Other Allowances", value: otherAllowances },
              ].map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-700">{item.label}</span>
                  <div className="flex items-center">
                    <span className="mr-2 text-gray-700">₹</span>
                    <span className="w-32 bg-gray-50 border border-gray-300 rounded-md px-3 py-1 text-gray-900">
                      {item.value.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}

              {customEarnings.map((earning) => (
                <div
                  key={earning.id}
                  className="flex justify-between items-center"
                >
                  <div className="flex items-center">
                    <span className="text-gray-700 mr-2">{earning.label}</span>
                    <button
                      onClick={() => removeCustomEarning(earning.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2 text-gray-700">₹</span>
                    <input
                      type="number"
                      value={earning.value}
                      onChange={(e) =>
                        updateCustomEarning(earning.id, e.target.value)
                      }
                      className="w-32 bg-gray-50 border border-gray-300 rounded-md px-3 py-1 text-gray-900"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-blue-900">Deductions</h4>
                <button
                  onClick={() => setShowDeductionOptions(!showDeductionOptions)}
                  className="p-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              {showDeductionOptions && (
                <div className="bg-gray-50 p-3 rounded-md mb-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    Add Deduction:
                  </h5>
                  <div className="grid grid-cols-1 gap-2">
                    {deductionOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => addCustomDeduction(option)}
                        className="text-left px-3 py-1 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-sm"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {[
                { label: "PF", value: pfDeduction, key: "pf" },
                {
                  label: "Other Deductions",
                  value: otherDeduction,
                  key: "other",
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center relative"
                  onMouseEnter={() => setHoveredDeduction(item.key)}
                  onMouseLeave={() => setHoveredDeduction(null)}
                >
                  <span className="text-gray-700">{item.label}</span>
                  <div className="flex items-center">
                    <span className="mr-2 text-gray-700">₹</span>
                    <span className="w-32 bg-gray-50 border border-gray-300 rounded-md px-3 py-1 text-gray-900">
                      {item.value.toFixed(2)}
                    </span>
                  </div>

                  {hoveredDeduction === item.key && (
                    <div className="absolute top-full right-0 mt-1 p-2 bg-gray-800 text-white text-xs rounded-md z-10 shadow-lg">
                      <div className="font-semibold">{item.label} Details</div>
                      <div>
                        Rate:{" "}
                        {item.key === "pf" ? "12%" : "As per company policy"}
                      </div>
                      <div>Calculated on: Basic Salary</div>
                    </div>
                  )}
                </div>
              ))}

              {customDeductions.map((deduction) => (
                <div
                  key={deduction.id}
                  className="flex justify-between items-center"
                >
                  <div className="flex items-center">
                    <span className="text-gray-700 mr-2">
                      {deduction.label}
                    </span>
                    <button
                      onClick={() => removeCustomDeduction(deduction.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2 text-gray-700">₹</span>
                    <input
                      type="number"
                      value={deduction.value}
                      onChange={(e) =>
                        updateCustomDeduction(deduction.id, e.target.value)
                      }
                      className="w-32 bg-gray-50 border border-gray-300 rounded-md px-3 py-1 text-gray-900"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700">Gross Salary</span>
              <span className="text-blue-900 font-semibold">
                ₹{grossSalary.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700">
                Total Deductions
              </span>
              <span className="text-blue-900 font-semibold">
                ₹{totalDeductions.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold mt-2 pt-2 border-t border-gray-200">
              <span className="text-gray-900">Net Salary</span>
              <span className="text-blue-900">₹{netSalary.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Payslips tab
  const renderPayslips = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-blue-900">
          Payslip Templates
        </h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center">
          <Plus size={18} className="mr-2" />
          New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="bg-white bg-opacity-70 backdrop-blur-md rounded-2xl p-6 border border-gray-200 shadow-lg hover:border-blue-500 transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-medium text-gray-900">Template {item}</h4>
              <div className="flex space-x-2">
                <button className="p-1 rounded-md hover:bg-gray-100">
                  <FileText size={16} className="text-gray-600" />
                </button>
                <button className="p-1 rounded-md hover:bg-gray-100">
                  <Download size={16} className="text-gray-600" />
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-4">
              Last modified: 15 Aug 2023
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render Salary Sheet tab with action buttons
  const renderSalarySheet = () => (
    <div
      className="overflow-x-auto"
      style={{ maxHeight: "calc(100vh - 250px)", minHeight: "400px" }}
    >
      <table className="min-w-full h-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
              Emp ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
              Year
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
              Month
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
              Basic
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
              Leave Travel Allowance
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
              Bonus
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
              Other Allowance
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
              Overtime
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-green-200">
              Gross Salary
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
              PF
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
              Loan
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
              Other Deduction
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-red-100">
              Total Deduction
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
              Net Salary
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
              Pay Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {payrollData.length > 0 ? (
            payrollData.map((item, index) => {
              return (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.employeeId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.employeeName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{item.basic.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{item.lta.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{item.bonus.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{item.otherAllowances.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{item.overtime.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-green-100">
                    ₹{item.gross.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{item.pf.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{item.loan.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{item.otherDeductions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-red-50">
                    ₹{item.totalDeductions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-900">
                    ₹{item.net.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === "processed" || item.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : item.status === "draft"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.payDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="relative group">
                      <button className="p-1 rounded-md hover:bg-gray-100">
                        <MoreVertical size={16} />
                      </button>
                      <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 border border-gray-200">
                        <button
                          onClick={() =>
                            handleViewCTCBreakdown(item.employeeId)
                          }
                          className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded-t-md text-gray-700 flex items-center"
                        >
                          <Eye size={14} className="mr-2" />
                          CTC Breakdown
                        </button>
                        <button className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center">
                          <FileText size={14} className="mr-2" />
                          View Payslip
                        </button>
                        <button className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded-b-md text-gray-700 flex items-center">
                          <Download size={14} className="mr-2" />
                          Download
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="18" className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center">
                  <FileText size={48} className="text-gray-400 mb-4" />
                  <p className="text-gray-500 text-lg font-medium">
                    No payroll data found
                  </p>
                  <p className="text-gray-400 mt-1">
                    Try adjusting your search or filters
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // Render the appropriate tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "salary":
        return renderSalarySheet();
      case "ctc":
        return renderCTCBreakdown();
      case "payslips":
        return renderPayslips();
      default:
        return renderSalarySheet();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-6">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
            notification.type === "error"
              ? "bg-red-100 text-red-800 border border-red-300"
              : "bg-green-100 text-green-800 border border-green-300"
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900">
            Payroll Management
          </h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowNewPayrollModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus size={18} className="mr-2" />
              New Payroll
            </button>
            <div className="relative group">
              <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center text-gray-700">
                <Download size={18} className="mr-2" />
                Export
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 border border-gray-200">
                <button
                  onClick={() => handleExport("pdf")}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded-t-lg text-gray-700"
                >
                  Export as PDF
                </button>
                <button
                  onClick={() => handleExport("excel")}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded-b-lg text-gray-700"
                >
                  Export as Excel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Row */}
        <div className="bg-white bg-opacity-70 backdrop-blur-md rounded-2xl p-4 md:p-6 border border-gray-200 shadow-lg">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or employee ID..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search
                  size={20}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative">
                <input
                  type="month"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <Calendar
                  size={20}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
              </div>

              <div className="relative group">
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 p-4 space-y-2 border border-gray-200">
                  <div>
                    <label className="block text-sm mb-1 text-gray-700">
                      Department
                    </label>
                    <select
                      value={filters.department}
                      onChange={(e) =>
                        handleFilterChange("department", e.target.value)
                      }
                      className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-1 text-gray-900 text-sm"
                    >
                      <option value="">All Departments</option>
                      <option value="IT">IT</option>
                      <option value="HR">HR</option>
                      <option value="Finance">Finance</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-gray-700">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) =>
                        handleFilterChange("status", e.target.value)
                      }
                      className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-1 text-gray-900 text-sm"
                    >
                      <option value="">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="processed">Processed</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-gray-700">
                      Employment Type
                    </label>
                    <select
                      value={filters.employmentType}
                      onChange={(e) =>
                        handleFilterChange("employmentType", e.target.value)
                      }
                      className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-1 text-gray-900 text-sm"
                    >
                      <option value="">All Types</option>
                      <option value="fulltime">Full Time</option>
                      <option value="parttime">Part Time</option>
                      <option value="contract">Contract</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white bg-opacity-70 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto -mb-px">
              {[
                { id: "salary", label: "Salary Sheet", icon: CreditCard },
                { id: "payslips", label: "Payslips", icon: FileText },
                { id: "ctc", label: "CTC Breakdown", icon: BarChart3 },
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <IconComponent size={18} className="mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="px-6 py-12 text-center">
                <p className="text-red-600">Error: {error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : (
              renderTabContent()
            )}
          </div>
        </div>
      </div>
      {showNewPayrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-blue-900">
                Add New Payroll Entry
              </h2>
              <button
                onClick={() => setShowNewPayrollModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={newPayrollData.employeeId}
                  readOnly
                  className="w-full bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee Name
                </label>
                <select
                  value={newPayrollData.employeeName}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                >
                  <option value="">Select Employee</option>
                  {employeesList.map((employee) => (
                    <option
                      key={employee.employeeId}
                      value={employee.employeeName}
                    >
                      {employee.employeeName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <input
                  type="number"
                  value={newPayrollData.year}
                  onChange={(e) =>
                    setNewPayrollData({
                      ...newPayrollData,
                      year: parseInt(e.target.value),
                    })
                  }
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Month
                </label>
                <select
                  value={newPayrollData.month}
                  onChange={(e) =>
                    setNewPayrollData({
                      ...newPayrollData,
                      month: parseInt(e.target.value),
                    })
                  }
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                >
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Basic Salary
                </label>
                <input
                  type="number"
                  value={newPayrollData.basic}
                  onChange={(e) =>
                    setNewPayrollData({
                      ...newPayrollData,
                      basic: parseFloat(e.target.value),
                    })
                  }
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leave Travel Allowance
                </label>
                <input
                  type="number"
                  value={newPayrollData.lta}
                  onChange={(e) =>
                    setNewPayrollData({
                      ...newPayrollData,
                      lta: parseFloat(e.target.value),
                    })
                  }
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bonus
                </label>
                <input
                  type="number"
                  value={newPayrollData.bonus}
                  onChange={(e) =>
                    setNewPayrollData({
                      ...newPayrollData,
                      bonus: parseFloat(e.target.value),
                    })
                  }
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Other Allowance
                </label>
                <input
                  type="number"
                  value={newPayrollData.otherAllowances}
                  onChange={(e) =>
                    setNewPayrollData({
                      ...newPayrollData,
                      otherAllowances: parseFloat(e.target.value),
                    })
                  }
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overtime
                </label>
                <input
                  type="number"
                  value={newPayrollData.overtime}
                  onChange={(e) =>
                    setNewPayrollData({
                      ...newPayrollData,
                      overtime: parseFloat(e.target.value),
                    })
                  }
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PF
                </label>
                <input
                  type="number"
                  value={newPayrollData.pf}
                  onChange={(e) =>
                    setNewPayrollData({
                      ...newPayrollData,
                      pf: parseFloat(e.target.value),
                    })
                  }
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loan
                </label>
                <input
                  type="number"
                  value={newPayrollData.loan}
                  onChange={(e) =>
                    setNewPayrollData({
                      ...newPayrollData,
                      loan: parseFloat(e.target.value),
                    })
                  }
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Other Deduction
                </label>
                <input
                  type="number"
                  value={newPayrollData.otherDeductions}
                  onChange={(e) =>
                    setNewPayrollData({
                      ...newPayrollData,
                      otherDeductions: parseFloat(e.target.value),
                    })
                  }
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={newPayrollData.status}
                  onChange={(e) =>
                    setNewPayrollData({
                      ...newPayrollData,
                      status: e.target.value,
                    })
                  }
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                >
                  <option value="draft">Draft</option>
                  <option value="processed">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pay Date
                </label>
                <input
                  type="date"
                  value={newPayrollData.payDate}
                  onChange={(e) =>
                    setNewPayrollData({
                      ...newPayrollData,
                      payDate: e.target.value,
                    })
                  }
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowNewPayrollModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitNewPayroll}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Payroll;