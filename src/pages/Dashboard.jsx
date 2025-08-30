import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  Users, 
  UserCheck, 
  UserX, 
  UserPlus,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

const Dashboard = () => {
  const [totalEmployee, setTotalEmployee] = useState(0);
  const [activeEmployee, setActiveEmployee] = useState(0);
  const [leftEmployee, setLeftEmployee] = useState(0);
  const [leaveThisMonth, setLeaveThisMonth] = useState(0);
  const [monthlyHiringData, setMonthlyHiringData] = useState([]);
  const [designationData, setDesignationData] = useState([]);
  
  // Mock data for other charts
  const employeeStatusData = [
    { name: 'Active', value: activeEmployee, color: '#10B981' },
    { name: 'Resigned', value: leftEmployee, color: '#EF4444' }
  ];

  const performanceData = [
    { month: 'Jan', productivity: 85, satisfaction: 78 },
    { month: 'Feb', productivity: 88, satisfaction: 82 },
    { month: 'Mar', productivity: 92, satisfaction: 85 },
    { month: 'Apr', productivity: 89, satisfaction: 88 },
    { month: 'May', productivity: 94, satisfaction: 90 },
    { month: 'Jun', productivity: 96, satisfaction: 92 }
  ];

  const parseSheetDate = (dateStr) => {
    if (!dateStr) return null;
    
    // Already a Date object
    if (dateStr instanceof Date) return dateStr;
    
    // Try ISO / normal parse
    const iso = Date.parse(dateStr);
    if (!isNaN(iso)) return new Date(iso);
    
    // Try dd/mm/yyyy or d/m/yyyy
    const parts = dateStr.toString().split(/[\/\-]/); // split by "/" or "-"
    if (parts.length === 3) {
      let [day, month, year] = parts.map(p => parseInt(p, 10));
      if (year < 100) year += 2000; // handle yy
      return new Date(year, month - 1, day);
    }
    
    return null;
  };

  const fetchJoiningCount = async () => {
    try {
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbyWlc2CfrDgr1JGsJHl1N4nRf-GAR-m6yqPPuP8Oggcafv3jo4thFrhfAX2vnfSzLQLlg/exec?sheet=JOINING&action=fetch'
      );
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const result = await response.json();
  
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data from JOINING sheet');
      }
  
      const rawData = result.data || result;
      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }
  
      // Headers are row 6 → index 5
      const headers = rawData[5];
      const dataRows = rawData.length > 6 ? rawData.slice(6) : [];
  
      // Find index of "Status", "Date of Joining", and "Designation" columns
      const statusIndex = headers.findIndex(
        h => h && h.toString().trim().toLowerCase() === "status"
      );
      
      const dateOfJoiningIndex = headers.findIndex(
        h => h && h.toString().trim().toLowerCase().includes("date of joining")
      );

      const designationIndex = headers.findIndex(
        h => h && h.toString().trim().toLowerCase() === "designation"
      );
  
      let activeCount = 0;
      const monthlyHiring = {};
      const designationCounts = {};
      
      // Initialize monthly hiring data for the last 6 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentDate = new Date();
      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentDate.getMonth() - i + 12) % 12;
        const monthYear = `${months[monthIndex]} ${currentDate.getFullYear()}`;
        monthlyHiring[monthYear] = { hired: 0 };
      }
  
      if (statusIndex !== -1) {
        activeCount = dataRows.filter(
          row => row[statusIndex]?.toString().trim().toLowerCase() === "active"
        ).length;
      }
  
      // Count hires by month if date of joining column exists
      if (dateOfJoiningIndex !== -1) {
        dataRows.forEach(row => {
          const dateStr = row[dateOfJoiningIndex];
          if (dateStr) {
            const date = parseSheetDate(dateStr);
            if (date) {
              const monthYear = `${months[date.getMonth()]} ${date.getFullYear()}`;
              if (monthlyHiring[monthYear]) {
                monthlyHiring[monthYear].hired += 1;
              } else {
                monthlyHiring[monthYear] = { hired: 1 };
              }
            }
          }
        });
      }

      // Count employees by designation
      if (designationIndex !== -1) {
        dataRows.forEach(row => {
          const designation = row[designationIndex]?.toString().trim();
          if (designation) {
            if (designationCounts[designation]) {
              designationCounts[designation] += 1;
            } else {
              designationCounts[designation] = 1;
            }
          }
        });

        // Convert to array format for the chart
        const designationArray = Object.keys(designationCounts).map(key => ({
          designation: key,
          employees: designationCounts[key]
        }));

        setDesignationData(designationArray);
      }
  
      // Update state
      setTotalEmployee(dataRows.length);
      setActiveEmployee(activeCount);
      
      // Return both counts and monthly hiring data
      return { 
        total: dataRows.length, 
        active: activeCount,
        monthlyHiring 
      };
  
    } catch (error) {
      console.error("Error fetching joining count:", error);
      return { total: 0, active: 0, monthlyHiring: {} };
    }
  };

  const fetchLeaveCount = async () => {
    try {
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbyWlc2CfrDgr1JGsJHl1N4nRf-GAR-m6yqPPuP8Oggcafv3jo4thFrhfAX2vnfSzLQLlg/exec?sheet=LEAVING&action=fetch'
      );
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data from LEAVING sheet');
      }
  
      const rawData = result.data || result;
      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }
  
      const headers = rawData[5];       // Row 6 headers
      const dataRows = rawData.slice(6); // Row 7 onwards
  
      const normalize = (str) =>
        str ? str.toString().trim().toLowerCase().replace(/\s+/g, " ") : "";
  
      const dateIndex = headers.findIndex(
        (h) => normalize(h) === "date of leaving"
      );
  
      if (dateIndex === -1) {
        console.warn("⚠️ 'Date Of Leaving' column not found");
        setLeftEmployee(dataRows.length);
        setLeaveThisMonth(0);
        return { total: dataRows.length, monthlyLeaving: {} };
      }
  
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
  
      const thisMonthCount = dataRows.filter(row => {
        const parsedDate = parseSheetDate(row[dateIndex]);
        return (
          parsedDate &&
          parsedDate.getMonth() === currentMonth &&
          parsedDate.getFullYear() === currentYear
        );
      }).length;
  
      // Count leaving by month
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyLeaving = {};
      
      // Initialize monthly leaving data for the last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthIndex = (now.getMonth() - i + 12) % 12;
        const monthYear = `${months[monthIndex]} ${now.getFullYear()}`;
        monthlyLeaving[monthYear] = { left: 0 };
      }
  
      dataRows.forEach(row => {
        const dateStr = row[dateIndex];
        if (dateStr) {
          const date = parseSheetDate(dateStr);
          if (date) {
            const monthYear = `${months[date.getMonth()]} ${date.getFullYear()}`;
            if (monthlyLeaving[monthYear]) {
              monthlyLeaving[monthYear].left += 1;
            } else {
              monthlyLeaving[monthYear] = { left: 1 };
            }
          }
        }
      });
  
      // Update states
      setLeftEmployee(dataRows.length);
      setLeaveThisMonth(thisMonthCount);
  
      return { total: dataRows.length, monthlyLeaving };
  
    } catch (error) {
      console.error("Error fetching leave count:", error);
      return { total: 0, monthlyLeaving: {} };
    }
  };

  const prepareMonthlyHiringData = (hiringData, leavingData) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const result = [];
    
    // Get data for the last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentDate.getMonth() - i + 12) % 12;
      const monthYear = `${months[monthIndex]} ${currentDate.getFullYear()}`;
      
      result.push({
        month: months[monthIndex],
        hired: hiringData[monthYear]?.hired || 0,
        left: leavingData[monthYear]?.left || 0
      });
    }
    
    return result;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [joiningResult, leavingResult] = await Promise.all([
          fetchJoiningCount(),
          fetchLeaveCount()
        ]);
        
        // Prepare the monthly hiring data for the chart
        const monthlyData = prepareMonthlyHiringData(
          joiningResult.monthlyHiring, 
          leavingResult.monthlyLeaving
        );
        
        setMonthlyHiringData(monthlyData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">HR Dashboard</h1>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg border p-6 flex items-start">
          <div className="p-3 rounded-full bg-blue-100 mr-4">
            <Users size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Total Employees</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalEmployee}</h3>
            <p className="text-xs text-green-600 mt-1">+12% from last month</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6 flex items-start">
          <div className="p-3 rounded-full bg-green-100 mr-4">
            <UserCheck size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Active Employees</p>
            <h3 className="text-2xl font-bold text-gray-800">{activeEmployee}</h3>
            <p className="text-xs text-green-600 mt-1">+8% from last month</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6 flex items-start">
          <div className="p-3 rounded-full bg-amber-100 mr-4">
            <Clock size={24} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">On Resigned</p>
            <h3 className="text-2xl font-bold text-gray-800">{leftEmployee}</h3>
            <p className="text-xs text-amber-600 mt-1">2 pending approvals</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6 flex items-start">
          <div className="p-3 rounded-full bg-red-100 mr-4">
            <UserX size={24} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Left This Month</p>
            <h3 className="text-2xl font-bold text-gray-800">{leaveThisMonth}</h3>
            <p className="text-xs text-red-600 mt-1">2 resignations, 1 termination</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
            <Users size={20} className="mr-2" />
            Employee Status Distribution
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={employeeStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {employeeStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ color: '#374151' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
            <TrendingUp size={20} className="mr-2" />
            Monthly Hiring vs Attrition
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyHiringData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="month" stroke="#374151" />
                <YAxis stroke="#374151" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#374151'
                  }} 
                />
                <Legend wrapperStyle={{ color: '#374151' }} />
                <Bar dataKey="hired" name="Hired" fill="#10B981" />
                <Bar dataKey="left" name="Left" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

     
      </div>
       <div className="bg-white rounded-xl shadow-lg border p-6">
  <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
    <UserPlus size={20} className="mr-2" />
    Designation-wise Employee Count
  </h2>
  <div className="h-80">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={designationData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
        <XAxis dataKey="designation" stroke="#374151" />
        <YAxis stroke="#374151" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#374151'
          }} 
        />
        <Bar dataKey="employees" name="Employees">
          {designationData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={index % 3 === 0 ? '#EF4444' : index % 3 === 1 ? '#10B981' : '#3B82F6'} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>

      
    </div>
  );
};

export default Dashboard;