const bcrypt = require('bcryptjs');

async function getSeedData() {
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const teacherPasswordHash = await bcrypt.hash('Teacher@123', 10);
  const studentPasswordHash = await bcrypt.hash('Student@123', 10);

  const departments = [
    { code: 'CSE', name: 'Computer Science Engineering', description: 'Department of Computer Science & Engineering' },
    { code: 'AIDS', name: 'Artificial Intelligence and Data Science', description: 'Department of AI, Machine Learning and Data Science' },
    { code: 'ECE', name: 'Electronics and Communication Engineering', description: 'Department of Electronics and Telecommunication' },
    { code: 'MECH', name: 'Mechanical Engineering', description: 'Department of Mechanical Engineering and CAD/CAM' },
    { code: 'CIVIL', name: 'Civil Engineering', description: 'Department of Civil and Infrastructure Engineering' },
    { code: 'VLSI', name: 'VLSI Design and Technology', description: 'Department of VLSI Design, Semiconductor & Embedded Systems' },
    { code: 'ROBO', name: 'Automation and Robotics', description: 'Department of Robotics, Industrial Automation and Mechatronics' },
    { code: 'EE', name: 'Electrical Engineering', description: 'Department of Electrical Engineering and Power Systems' }
  ];

  const firstNames = [
    'Rahul', 'Priya', 'Aditya', 'Sneha', 'Rohan', 'Ananya', 'Amit', 'Pooja', 'Vikram', 'Neha',
    'Arjun', 'Tanvi', 'Siddharth', 'Divya', 'Karan', 'Meera', 'Gaurav', 'Ishita', 'Abhishek', 'Riya',
    'Manish', 'Kavita', 'Sanjay', 'Swati', 'Harsh', 'Shreya', 'Pranav', 'Nisha', 'Akash', 'Shruti',
    'Omkar', 'Sakshi', 'Mayur', 'Sonali', 'Nikhil', 'Tejaswini', 'Chetan', 'Deepika', 'Suraj', 'Preeti',
    'Yash', 'Pallavi', 'Kunal', 'Aparna', 'Swapnil', 'Komal', 'Tushar', 'Mansi', 'Sachin', 'Sayali'
  ];

  const lastNames = [
    'Patil', 'Sharma', 'Joshi', 'Kulkarni', 'Deshmukh', 'Verma', 'Nair', 'Chavan', 'Shinde', 'Pawar',
    'More', 'Gaekwad', 'Bhosale', 'Jadhav', 'Kale', 'Ghadge', 'Kadam', 'Thorat', 'Bichkar', 'Sawant',
    'Tambe', 'Salunkhe', 'Mane', 'Babar', 'Suryavanshi', 'Mohite', 'Gaikwad', 'Bhandari', 'Dhumal', 'Kharat'
  ];

  return {
    adminPasswordHash,
    teacherPasswordHash,
    studentPasswordHash,
    departments,
    firstNames,
    lastNames
  };
}

module.exports = {
  getSeedData
};
