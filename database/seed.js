require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  port: Number(process.env.DB_PORT || 3306),
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'online_quiz_db',
  waitForConnections: true,
  connectionLimit: 2
});

const categories = [
  {
    slug: 'java-programming', name: 'Java Programming', icon: 'java', sortOrder: 1,
    description: 'Build confidence with Java syntax, object-oriented design, and core APIs.',
    topics: ['Java Fundamentals', 'OOP Concepts', 'Strings and Arrays', 'Collections', 'Exception Handling']
  },
  {
    slug: 'dbms', name: 'Database Management Systems (DBMS)', icon: 'database', sortOrder: 2,
    description: 'Practice SQL, data modelling, normalization, and transaction concepts.',
    topics: ['SQL Basics', 'Joins and Subqueries', 'Normalization', 'ER Model', 'Transactions']
  },
  {
    slug: 'dsa', name: 'Data Structures and Algorithms (DSA)', icon: 'algorithm', sortOrder: 3,
    description: 'Strengthen problem-solving with arrays, strings, search, and core structures.',
    topics: ['Arrays', 'Strings', 'Searching and Sorting', 'Linked Lists', 'Stack and Queue', 'Recursion', 'Basic DSA Problems']
  },
  {
    slug: 'computer-networks', name: 'Computer Networks (CN)', icon: 'network', sortOrder: 4,
    description: 'Explore network layers, addressing, routing, and common protocols.',
    topics: ['OSI Model', 'TCP/IP', 'IP Addressing', 'Routing', 'Network Protocols']
  },
  {
    slug: 'operating-systems', name: 'Operating Systems (OS)', icon: 'system', sortOrder: 5,
    description: 'Learn how operating systems schedule work and manage resources.',
    topics: ['Process Management', 'CPU Scheduling', 'Deadlocks', 'Memory Management', 'File Systems']
  },
  {
    slug: 'aptitude-logical-reasoning', name: 'Aptitude and Logical Reasoning', icon: 'aptitude', sortOrder: 6,
    description: 'Develop speed and accuracy in quantitative and logical reasoning.',
    topics: ['Percentages', 'Profit and Loss', 'Time and Work', 'Time, Speed and Distance', 'Probability', 'Number Systems', 'Permutations and Combinations', 'Logical Reasoning', 'Verbal Ability']
  },
  {
    slug: 'placement-mock-tests', name: 'Placement Mock Tests', icon: 'career', sortOrder: 7,
    description: 'Take mixed-subject mock tests designed for placement screening.',
    topics: ['Technical Mock Tests', 'Full Placement Mocks']
  },
  {
    slug: 'company-placement-preparation', name: 'Company Placement Preparation', icon: 'career', sortOrder: 8,
    description: 'Practice the core subjects and assessments used in company placement rounds.',
    topics: [
      'Aptitude and Logical Reasoning', 'Java Placement Test', 'DSA Coding Test',
      'DBMS Placement Test', 'Computer Networks', 'Operating Systems',
      'Mixed Company Assessment'
    ]
  },
  {
    slug: 'placement-preparation', name: 'Placement Preparation', icon: 'career', sortOrder: 7,
    description: 'Prepare for technical screens, coding rounds, and company interviews.',
    topics: [
      'Technical MCQs', 'Coding Questions', 'Interview Questions', 'Company-wise Practice',
      'Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'Analytical Reasoning',
      'Programming Fundamentals', 'Coding MCQ Test', 'Full Placement Mock Test'
    ]
  },
  {
    slug: 'interview-preparation', name: 'Interview Preparation', icon: 'career', sortOrder: 16,
    description: 'Practice technical and behavioral interview topics.',
    topics: [
      'Technical Interview Questions', 'Behavioral Interviews', 'System Design',
      'Java Interview Questions', 'SQL Interview Questions', 'DBMS Interview Questions',
      'DSA Interview Questions', 'HR Interview Preparation', 'Technical Interview Round',
      'Programming Fundamentals'
    ]
  },
  {
    slug: 'general-knowledge', name: 'General Knowledge', icon: 'globe', sortOrder: 8,
    description: 'Review science, technology, history, geography, and current affairs.',
    topics: ['Science and Technology', 'Indian History', 'Geography', 'Current Affairs']
  },
  {
    slug: 'software-engineering', name: 'Software Engineering', icon: 'system', sortOrder: 9,
    description: 'Practice software development processes, design, testing, and teamwork.',
    topics: ['Software Development Life Cycle', 'Requirements and Design', 'Software Testing', 'Version Control', 'Agile Methods']
  },
  {
    slug: 'company-tcs', name: 'TCS Preparation', icon: 'career', sortOrder: 10,
    description: 'Original practice organized around aptitude, reasoning, verbal, and technical skills. Not actual company exam questions.',
    topics: ['Aptitude', 'Reasoning', 'Verbal Ability', 'Technical Skills']
  },
  {
    slug: 'company-infosys', name: 'Infosys Preparation', icon: 'career', sortOrder: 11,
    description: 'Original practice organized around aptitude, reasoning, verbal, and technical skills. Not actual company exam questions.',
    topics: ['Aptitude', 'Reasoning', 'Verbal Ability', 'Technical Skills']
  },
  {
    slug: 'company-wipro', name: 'Wipro Preparation', icon: 'career', sortOrder: 12,
    description: 'Original practice organized around aptitude, reasoning, verbal, and technical skills. Not actual company exam questions.',
    topics: ['Aptitude', 'Reasoning', 'Verbal Ability', 'Technical Skills']
  },
  {
    slug: 'company-accenture', name: 'Accenture Preparation', icon: 'career', sortOrder: 13,
    description: 'Original practice organized around aptitude, reasoning, verbal, and technical skills. Not actual company exam questions.',
    topics: ['Aptitude', 'Reasoning', 'Verbal Ability', 'Technical Skills']
  },
  {
    slug: 'company-deloitte', name: 'Deloitte Preparation', icon: 'career', sortOrder: 14,
    description: 'Original practice organized around aptitude, reasoning, verbal, and technical skills. Not actual company exam questions.',
    topics: ['Aptitude', 'Reasoning', 'Verbal Ability', 'Technical Skills']
  },
  {
    slug: 'company-cognizant', name: 'Cognizant Preparation', icon: 'career', sortOrder: 15,
    description: 'Original practice organized around aptitude, reasoning, verbal, and technical skills. Not actual company exam questions.',
    topics: ['Aptitude', 'Reasoning', 'Verbal Ability', 'Technical Skills']
  }
];

const Q = (text, options, correct, explanation, type = 'multiple_choice') => ({
  text, options, correct, explanation, type
});

const quizzes = [
  {
    key: 'sample-java-fundamentals', title: 'Java Fundamentals', category: 'java-programming', topic: 'Java Fundamentals', difficulty: 'beginner', duration: 15,
    description: 'Ten questions on Java syntax, types, compilation, and core language behavior.',
    questions: [
      Q('Which tool is included in the Java Development Kit but not required merely to run a compiled Java application?', ['Java compiler (javac)', 'Java virtual machine', 'Java class library', 'Java runtime launcher'], 0, 'The JDK includes development tools such as javac. A runtime installation supplies the components needed to execute compiled classes.'),
      Q('What does javac normally produce when it compiles a Java source file?', ['A native executable for one processor', 'Java bytecode in a .class file', 'A text-based assembly listing', 'A JavaScript module'], 1, 'javac compiles source into platform-independent bytecode stored in class files, which the JVM executes.'),
      Q('Which method signature is the conventional entry point for a Java application?', ['public static void main(String[] args)', 'public void start(String args)', 'static int main(String[] args)', 'private static void main()'], 0, 'The launcher looks for a public static main method that accepts a String array and returns void.'),
      Q('Which primitive type stores only the values true and false?', ['int', 'char', 'boolean', 'byte'], 2, 'The boolean primitive represents the two logical values true and false.'),
      Q('What is true about Java String objects?', ['Their contents can be changed in place', 'They are immutable', 'They can only contain ASCII characters', 'They are primitive values'], 1, 'String is an immutable reference type; operations that appear to modify it create another String.'),
      Q('For two int variables a and b, what does the expression a == b compare?', ['Whether both variables refer to the same object', 'Their numeric values', 'Their declared names', 'Their memory sizes'], 1, 'For primitive operands, == compares values. For reference operands it compares references.'),
      Q('Given int[] values = {4, 7, 9}; what is values.length?', ['2', '3', '4', '9'], 1, 'An array length is the number of elements it contains, here three.'),
      Q('What is the result of the Java integer expression 7 / 2?', ['3', '3.5', '4', 'Compilation error'], 0, 'Both operands are integers, so integer division discards the fractional part and yields 3.'),
      Q('What does the final modifier prevent for a local variable after it has been assigned?', ['Reading the variable', 'Reassigning the variable', 'Using it in a method', 'Passing it as an argument'], 1, 'A final local variable can be assigned once and cannot later be reassigned.'),
      Q('Java source files conventionally use the .java file extension.', ['True', 'False'], 0, 'Java source compilation units conventionally end in .java; compiled bytecode uses .class.', 'true_false')
    ]
  },
  {
    key: 'sample-java-oop', title: 'Java OOP Concepts', category: 'java-programming', topic: 'OOP Concepts', difficulty: 'intermediate', duration: 15,
    description: 'Ten questions on encapsulation, inheritance, polymorphism, and Java object design.',
    questions: [
      Q('Which object-oriented principle bundles state with methods and controls access to that state?', ['Encapsulation', 'Recursion', 'Compilation', 'Serialization'], 0, 'Encapsulation combines data and behavior and uses access control to protect an object’s internal state.'),
      Q('Which keyword declares that class Dog inherits from class Animal?', ['implements', 'extends', 'inherits', 'super'], 1, 'A Java class extends one other class to inherit its accessible members.'),
      Q('When an overridden instance method is called through a superclass reference, which implementation is selected?', ['Always the superclass implementation', 'The implementation for the runtime object type', 'The first method in the source file', 'The method with the fewest parameters'], 1, 'Dynamic dispatch selects the overridden instance method based on the actual runtime class.'),
      Q('Which feature lets a method accept a general abstraction while different implementations provide behavior?', ['Abstraction', 'Casting only', 'Field hiding', 'Package access'], 0, 'Abstraction exposes a contract while implementations provide the concrete behavior.'),
      Q('Which statement about a Java constructor is correct?', ['It has the same name as its class and no return type', 'It must return the constructed object', 'It is declared with the constructor keyword', 'It is inherited by every subclass'], 0, 'A constructor has the class name and declares no return type, not even void.'),
      Q('Defining methods with the same name but different parameter lists in one class is called:', ['Overloading', 'Overriding', 'Encapsulation', 'Delegation'], 0, 'Overloading is resolved using the method name and parameter types at compile time.'),
      Q('Which condition is required for a subclass method to override an instance method?', ['It has a compatible signature and an allowed return type', 'It has a different name', 'It must be private', 'It must be static'], 0, 'Overriding requires a matching method signature and a return type that is the same or covariant.'),
      Q('Inside a subclass constructor, what does super(...) call?', ['A superclass constructor', 'The current object’s finalizer', 'A static initializer', 'An interface default method only'], 0, 'A super constructor invocation initializes the superclass portion of the new object.'),
      Q('Which keyword is used when a class provides implementations for an interface?', ['extends', 'implements', 'instanceof', 'package'], 1, 'A class implements an interface; an interface can extend other interfaces.'),
      Q('Java constructors are inherited by subclasses in the same way as public methods.', ['True', 'False'], 1, 'Constructors are not inherited. A subclass constructor can invoke a superclass constructor with super(...).', 'true_false')
    ]
  },
  {
    key: 'sample-sql-basics', title: 'SQL Basics', category: 'dbms', topic: 'SQL Basics', difficulty: 'beginner', duration: 15,
    description: 'Ten questions on selecting, filtering, ordering, and changing relational data.',
    questions: [
      Q('Which SQL statement retrieves rows from a table?', ['SELECT', 'FETCH TABLE', 'READ', 'OPEN'], 0, 'SELECT is the standard SQL statement for querying rows and expressions.'),
      Q('Which clause filters rows before grouping and aggregation?', ['WHERE', 'HAVING', 'ORDER BY', 'GROUP BY'], 0, 'WHERE filters input rows. HAVING filters groups after GROUP BY.'),
      Q('How do you test whether a column has no SQL value?', ['column = NULL', 'column IS NULL', 'column == NULL', 'column EQUALS NULL'], 1, 'NULL represents an unknown or missing value; use IS NULL rather than equality comparison.'),
      Q('Which clause sorts query results by a column?', ['ORDER BY', 'SORT', 'ARRANGE BY', 'GROUP BY'], 0, 'ORDER BY specifies the result ordering and supports ASC or DESC.'),
      Q('What does SELECT DISTINCT city FROM places do?', ['Returns each distinct city value once', 'Deletes duplicate city rows', 'Counts cities', 'Sorts cities alphabetically in every SQL dialect'], 0, 'DISTINCT removes duplicate result rows from the selected expressions; it does not modify stored data.'),
      Q('Which aggregate counts all rows, including rows with NULL values in individual columns?', ['COUNT(*)', 'COUNT(column)', 'SUM(*)', 'ROWS()'], 0, 'COUNT(*) counts rows. COUNT(column) counts only rows where that expression is not NULL.'),
      Q('Which statement adds a new row to a table?', ['INSERT INTO', 'ADD ROW', 'UPDATE INTO', 'CREATE ROW'], 0, 'INSERT INTO adds rows to an existing table.'),
      Q('Which statement changes existing rows in a table?', ['UPDATE', 'ALTER ROW', 'REPLACE TABLE', 'MODIFY DATABASE'], 0, 'UPDATE changes column values for rows selected by its optional WHERE clause.'),
      Q('What is the main risk of running DELETE FROM employees without a WHERE clause?', ['It deletes every row in the table', 'It deletes only duplicate rows', 'It drops the table definition', 'It affects no rows'], 0, 'Without a WHERE clause, DELETE targets all rows while leaving the table itself in place.'),
      Q('In a grouped query, which clause filters groups using an aggregate condition such as COUNT(*) > 2?', ['HAVING', 'WHERE', 'ORDER BY', 'VALUES'], 0, 'HAVING is applied to groups and can filter on aggregate expressions.', 'multiple_choice')
    ]
  },
  {
    key: 'sample-dbms-normalization', title: 'DBMS Normalization', category: 'dbms', topic: 'Normalization', difficulty: 'intermediate', duration: 15,
    description: 'Ten questions on functional dependencies, keys, and common normal forms.',
    questions: [
      Q('Which property is required by First Normal Form (1NF)?', ['Each cell contains a single value from its domain', 'Every table has exactly two columns', 'Every non-key attribute depends on the whole key', 'Every determinant is a superkey'], 0, '1NF requires atomic values in each row-column position and no repeating groups.'),
      Q('A functional dependency X → Y means:', ['Each X value determines a unique Y value', 'Every Y value determines a unique X value', 'X and Y must be primary keys', 'X and Y contain the same values'], 0, 'For each pair of rows that agree on X, the dependency requires them to agree on Y.'),
      Q('A table has a composite candidate key (student_id, course_id). A non-key attribute depends only on student_id. Which issue does this describe?', ['A partial dependency', 'A transitive dependency', 'A multivalued dependency only', 'A foreign-key violation'], 0, 'A dependency on a proper subset of a composite candidate key is partial and violates 2NF.'),
      Q('Second Normal Form (2NF) primarily removes:', ['Partial dependencies of non-prime attributes on candidate keys', 'All foreign keys', 'All candidate keys', 'Every join dependency'], 0, '2NF requires 1NF and no non-prime attribute to depend on just part of a candidate key.'),
      Q('Which dependency pattern is the classic transitive-dependency problem addressed by 3NF?', ['Key → non-key A → non-key B', 'Key → every attribute directly', 'A candidate key → itself', 'Foreign key → primary key'], 0, 'A non-key attribute determining another non-key attribute creates a transitive dependency on the key.'),
      Q('For every non-trivial functional dependency X → Y in BCNF, what must X be?', ['A superkey', 'A foreign key', 'A single attribute', 'A non-prime attribute'], 0, 'BCNF requires the determinant of every non-trivial functional dependency to be a superkey.'),
      Q('What does a lossless decomposition guarantee?', ['Joining the decomposed relations reconstructs exactly the original relation', 'Every relation has the same number of columns', 'No functional dependency can exist', 'All joins become faster'], 0, 'A lossless decomposition avoids spurious rows and preserves the original relation when the parts are joined.'),
      Q('A candidate key is:', ['A minimal set of attributes that uniquely identifies each row', 'Any attribute that contains NULL', 'A foreign key referencing another table', 'A set of attributes chosen only for display'], 0, 'A candidate key is a minimal superkey: it uniquely identifies rows and has no removable attribute.'),
      Q('Which statement about 3NF is correct?', ['It is less restrictive than BCNF', 'It forbids all foreign keys', 'It requires every table to have one column', 'It is stricter than BCNF'], 0, 'BCNF is stronger; every BCNF relation is in 3NF, but a 3NF relation need not be in BCNF.'),
      Q('A decomposition can preserve all functional dependencies even when it is not lossless.', ['True', 'False'], 0, 'Dependency preservation and losslessness are different properties; one does not automatically guarantee the other.', 'true_false')
    ]
  },
  {
    key: 'sample-cn-osi', title: 'Computer Networks: OSI Model', category: 'computer-networks', topic: 'OSI Model', difficulty: 'beginner', duration: 15,
    description: 'Ten questions on the seven OSI layers and their responsibilities.',
    questions: [
      Q('How many layers are in the OSI reference model?', ['Four', 'Five', 'Seven', 'Eight'], 2, 'The OSI reference model defines seven layers, from Physical through Application.'),
      Q('Which OSI layer is responsible for logical addressing and routing between networks?', ['Data Link', 'Network', 'Transport', 'Session'], 1, 'The Network layer handles logical addressing and forwarding across interconnected networks.'),
      Q('Which OSI layer provides end-to-end transport services such as segmentation and reliability?', ['Physical', 'Transport', 'Presentation', 'Application'], 1, 'The Transport layer provides host-to-host delivery and may provide reliability and flow control.'),
      Q('At which OSI layer is TCP commonly placed?', ['Layer 2, Data Link', 'Layer 3, Network', 'Layer 4, Transport', 'Layer 7, Application'], 2, 'TCP is a Transport-layer protocol in the OSI mapping.'),
      Q('Which OSI layer transmits raw bits over a physical medium?', ['Physical', 'Network', 'Session', 'Application'], 0, 'The Physical layer defines signaling and transmission of bits over a medium.'),
      Q('Which layer commonly handles frames and local hardware (MAC) addressing?', ['Data Link', 'Transport', 'Presentation', 'Session'], 0, 'The Data Link layer organizes bits into frames and provides local-link delivery.'),
      Q('Which OSI layer manages dialog control between communicating applications?', ['Network', 'Session', 'Physical', 'Data Link'], 1, 'The Session layer is associated with establishing, managing, and ending communication dialogs.'),
      Q('Encryption representation and data-format translation are traditionally associated with which OSI layer?', ['Presentation', 'Transport', 'Network', 'Physical'], 0, 'The Presentation layer is commonly described as handling representation, transformation, and encryption formats.'),
      Q('HTTP and DNS are commonly mapped to which OSI layer?', ['Application', 'Data Link', 'Physical', 'Network'], 0, 'Application protocols provide services used by end-user applications and are mapped to the Application layer.'),
      Q('The OSI layers are numbered from Layer 1 Physical to Layer 7 Application.', ['True', 'False'], 0, 'The conventional OSI order starts with Physical at Layer 1 and ends with Application at Layer 7.', 'true_false')
    ]
  },
  {
    key: 'sample-tcpip-protocols', title: 'TCP/IP and Protocols', category: 'computer-networks', topic: 'TCP/IP', difficulty: 'intermediate', duration: 15,
    description: 'Ten questions on TCP/IP transport, addressing, and everyday network protocols.',
    questions: [
      Q('Which statement best describes IP delivery?', ['It provides best-effort packet delivery without guaranteeing arrival', 'It guarantees ordered delivery and retransmission', 'It encrypts every packet by default', 'It establishes a connection before every packet'], 0, 'IP is connectionless and best-effort; reliability is provided by higher-layer protocols when needed.'),
      Q('Which transport protocol provides a reliable, ordered byte stream?', ['UDP', 'TCP', 'ARP', 'ICMP'], 1, 'TCP uses acknowledgements, sequence numbers, and retransmission to provide reliable ordered delivery.'),
      Q('Which statement about UDP is correct?', ['It has no built-in delivery or ordering guarantee', 'It always retransmits lost packets', 'It establishes a three-way handshake', 'It is an application-layer name service'], 0, 'UDP is connectionless and has low transport overhead, but does not guarantee delivery or ordering.'),
      Q('What service does DNS primarily provide?', ['Maps domain names to resource records such as IP addresses', 'Assigns a MAC address to every router', 'Encrypts web traffic', 'Transfers files only over TCP port 20'], 0, 'DNS resolves names using records such as A and AAAA, among other record types.'),
      Q('Which protocol commonly assigns IP configuration automatically to a host?', ['DHCP', 'SMTP', 'SSH', 'NTP'], 0, 'DHCP can provide a host with an address lease and related network configuration.'),
      Q('What security does HTTPS add to HTTP in normal web deployments?', ['TLS-protected communication', 'A guarantee that the website is truthful', 'A larger IP address space', 'Automatic DNSSEC validation'], 0, 'HTTPS uses HTTP over TLS to provide confidentiality and integrity and authenticate the server endpoint.'),
      Q('Which TCP port is the default for HTTPS?', ['25', '53', '80', '443'], 3, 'TCP port 443 is the standard default port for HTTPS.'),
      Q('On a typical IPv4 LAN, what does ARP resolve?', ['An IPv4 address to a link-layer address on the local network', 'A domain name to an IPv6 address', 'A TCP port to a process ID', 'A MAC address to a subnet mask'], 0, 'ARP discovers the link-layer address corresponding to an IPv4 next hop on the local link.'),
      Q('What is the usual order of the TCP three-way handshake?', ['SYN, SYN-ACK, ACK', 'ACK, FIN, SYN', 'SYN-ACK, ACK, FIN', 'FIN, FIN-ACK, ACK'], 0, 'A client sends SYN, the server replies SYN-ACK, and the client completes the handshake with ACK.'),
      Q('An IPv6 address is 128 bits long.', ['True', 'False'], 0, 'IPv6 uses 128-bit addresses, compared with IPv4’s 32-bit addresses.', 'true_false')
    ]
  },
  {
    key: 'sample-dsa-arrays-strings', title: 'DSA: Arrays and Strings', category: 'dsa', topic: 'Arrays', difficulty: 'beginner', duration: 15,
    description: 'Ten questions on array access, traversal, searching, and string techniques.',
    questions: [
      Q('In a zero-indexed array, what is the index of the first element?', ['0', '1', '-1', 'It depends on the element type'], 0, 'Most mainstream programming-language arrays use zero-based indexing, so the first element is at index 0.'),
      Q('What is the time complexity of reading an array element by a valid index?', ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], 0, 'Array indexing computes an address directly, giving constant-time access.'),
      Q('How long does a simple loop that visits each of n array elements take?', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], 2, 'The loop performs a constant amount of work for each of n elements, so its time is linear.'),
      Q('What precondition does standard binary search require for a sorted ascending array?', ['Elements must be sorted according to the search order', 'Array length must be a power of two', 'All elements must be unique', 'The array must contain at least 100 items'], 0, 'Binary search discards half the remaining interval based on ordering, so the data must be sorted.'),
      Q('Which technique is commonly used to find a pair in a sorted array whose sum equals a target?', ['Two pointers moving inward', 'Depth-first search on a tree', 'A queue-only breadth-first traversal', 'Heapifying every element repeatedly'], 0, 'With sorted input, two pointers can move inward based on whether the current sum is too small or large.'),
      Q('What is the time complexity of reversing a string represented by a mutable character array of length n in place?', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], 2, 'Each character is swapped at most once with its counterpart, requiring linear time.'),
      Q('If a loop compares every pair of distinct positions in an array of n items, what is its typical time complexity?', ['O(log n)', 'O(n)', 'O(n²)', 'O(2ⁿ)'], 2, 'There are n(n-1)/2 position pairs, which grows quadratically.'),
      Q('Why can repeated concatenation of immutable strings inside a loop be inefficient?', ['Each concatenation may allocate and copy a growing result', 'Strings cannot contain letters', 'It changes the loop counter automatically', 'It makes indexing constant-time'], 0, 'Immutable string concatenation can repeatedly copy prior content; a mutable builder avoids much of that repeated work.'),
      Q('Which algorithmic technique maintains a running total while scanning a numeric array?', ['Prefix accumulation', 'Binary heap deletion', 'Graph coloring', 'Backtracking over all permutations'], 0, 'A running accumulator updates the current total once per element during a linear scan.'),
      Q('An array with n elements has valid zero-based indices from 0 through n, inclusive.', ['True', 'False'], 1, 'The final valid index is n - 1; index n is out of bounds.', 'true_false')
    ]
  },
  {
    key: 'sample-quantitative-aptitude', title: 'Quantitative Aptitude', category: 'aptitude-logical-reasoning', topic: 'Percentages', difficulty: 'beginner', duration: 15,
    description: 'Ten questions on percentages, number sense, rates, work, and probability.',
    questions: [
      Q('What is 20% of 150?', ['20', '25', '30', '35'], 2, '20% is 0.2, and 0.2 × 150 = 30.'),
      Q('A ratio of 2:3 represents a total of 25 items. How many items are in the first part?', ['5', '10', '15', '20'], 1, 'There are five total ratio parts; each is 25 ÷ 5 = 5, so the first part is 2 × 5 = 10.'),
      Q('The average of 6, 8, and 10 is:', ['7', '8', '9', '24'], 1, 'The sum is 24 and there are three values, so the average is 24 ÷ 3 = 8.'),
      Q('A vehicle travels 120 km in 2 hours at a constant speed. What is its speed?', ['40 km/h', '50 km/h', '60 km/h', '240 km/h'], 2, 'Speed equals distance divided by time: 120 ÷ 2 = 60 km/h.'),
      Q('A can finish a job in 10 days and B in 15 days. Working at constant rates together, how long will they take?', ['5 days', '6 days', '8 days', '12 days'], 1, 'Their combined daily rate is 1/10 + 1/15 = 1/6 of the job, so they need 6 days.'),
      Q('What is the simple interest on 1,000 at 5% per year for 2 years?', ['50', '100', '150', '200'], 1, 'Simple interest is principal × rate × time: 1,000 × 0.05 × 2 = 100.'),
      Q('A fair coin is tossed once. What is the probability of getting heads?', ['0', '1/4', '1/2', '1'], 2, 'There is one favorable outcome among two equally likely outcomes.'),
      Q('An item costs 400 and is sold for 460. What is the profit percentage on cost?', ['10%', '12%', '15%', '20%'], 2, 'Profit is 60; 60 ÷ 400 × 100 = 15%.'),
      Q('What is the least common multiple of 6 and 8?', ['12', '18', '24', '48'], 2, 'The smallest positive number divisible by both 6 and 8 is 24.'),
      Q('If 3 workers complete a fixed job in 12 days at equal rates, how many worker-days does the job require?', ['4', '15', '36', '48'], 2, 'Worker-days equal workers × days, so the job represents 3 × 12 = 36 worker-days under the stated equal-rate assumption.')
    ]
  },
  {
    key: 'sample-os-process-management', title: 'Operating Systems: Process Management', category: 'operating-systems', topic: 'Process Management', difficulty: 'intermediate', duration: 15,
    description: 'Ten questions on process states, scheduling, synchronization, and concurrency.',
    questions: [
      Q('An executing instance of a program, together with its state and resources, is called a:', ['Process', 'Source file', 'Compiler', 'Page table'], 0, 'A process is a program in execution with associated state and resources.'),
      Q('What is a context switch?', ['Saving one execution context and restoring another', 'Changing a source file into bytecode', 'Moving a file to another directory', 'Replacing a process ID with a thread ID'], 0, 'A context switch saves enough state to pause one task and resumes another task.'),
      Q('A process that is ready to run but waiting for CPU time is in which state?', ['Ready', 'Blocked', 'Terminated', 'New only'], 0, 'A ready process has the resources it needs except that it is waiting to be scheduled on a CPU.'),
      Q('Which scheduler most directly chooses a ready process to run next on a CPU?', ['Short-term scheduler', 'Long-term scheduler only', 'Disk scheduler', 'Name resolver'], 0, 'The short-term CPU scheduler selects a process from the ready queue for execution.'),
      Q('Which scheduling algorithm selects processes in arrival order and is generally non-preemptive?', ['First-Come, First-Served', 'Round Robin', 'Shortest Remaining Time First', 'Preemptive priority'], 0, 'FCFS ordinarily runs the earliest arriving ready process until it blocks or finishes.'),
      Q('In Round Robin scheduling, what is the time quantum?', ['A maximum time slice before a running process may be preempted', 'The number of processes in memory', 'The time needed to load the operating system', 'A permanent CPU reservation'], 0, 'Round Robin gives each ready process a bounded time slice, then places an unfinished process back in the ready queue.'),
      Q('Which synchronization primitive can control access to a shared resource using a counter or state?', ['Semaphore', 'Page frame', 'File descriptor', 'Instruction pointer'], 0, 'A semaphore coordinates access or signaling between concurrent tasks.'),
      Q('Which set lists the four necessary conditions traditionally associated with deadlock?', ['Mutual exclusion, hold and wait, no preemption, circular wait', 'Caching, paging, segmentation, swapping', 'Ready, running, blocked, terminated', 'Fetch, decode, execute, commit'], 0, 'The Coffman conditions are mutual exclusion, hold and wait, no preemption, and circular wait.'),
      Q('What is a key distinction between user mode and kernel mode?', ['Kernel mode can execute privileged instructions', 'User mode always has higher privilege', 'Only user mode can access memory', 'Kernel mode cannot handle interrupts'], 0, 'Kernel mode has privileges needed for protected operations; user mode restricts direct access to them.'),
      Q('Threads in the same process typically share the process address space.', ['True', 'False'], 0, 'Threads share process resources such as the address space, while each thread has its own execution state and stack.', 'true_false')
    ]
  },
  {
    key: 'sample-placement-mock', title: 'Placement Technical Mock Test', category: 'placement-mock-tests', topic: 'Technical Mock Tests', difficulty: 'intermediate', duration: 30,
    description: 'A 20-question mixed technical screening covering programming, databases, networks, OS, and aptitude.',
    questions: [
      Q('Which Java access modifier makes a member accessible only within its declaring class?', ['public', 'protected', 'private', 'package'], 2, 'A private member is accessible only within the declaring top-level class (with Java’s nested-class access rules).'),
      Q('What is printed by this Java code?\nint x = 3;\nSystem.out.println(x++ + ++x);', ['7', '8', '9', 'Compilation error'], 1, 'Java evaluates operands left to right: x++ contributes 3 and changes x to 4; ++x changes it to 5 and contributes 5, giving 8.', 'code_output'),
      Q('Which SQL clause combines rows from two tables based on a related condition?', ['JOIN ... ON', 'ORDER BY', 'HAVING', 'VALUES'], 0, 'JOIN ... ON specifies how rows from the participating tables match.'),
      Q('What is the result of COUNT(column_name) when column_name is NULL in a row?', ['That row is not counted', 'The query always errors', 'It counts as two rows', 'It converts NULL to zero'], 0, 'COUNT(expression) ignores rows where the expression evaluates to NULL; COUNT(*) still counts the row.'),
      Q('For a sorted array of n elements, what is binary search time complexity?', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], 1, 'Each comparison halves the remaining search interval, producing logarithmic time.'),
      Q('Which data structure follows Last In, First Out (LIFO)?', ['Queue', 'Stack', 'Priority queue', 'Adjacency list'], 1, 'A stack removes the most recently added element first.'),
      Q('Which OSI layer is responsible for routing packets between networks?', ['Data Link', 'Network', 'Session', 'Presentation'], 1, 'Routing between networks is a Network-layer responsibility.'),
      Q('Which protocol provides a reliable, ordered byte stream?', ['UDP', 'TCP', 'ARP', 'DNS'], 1, 'TCP provides reliable, ordered byte-stream delivery between endpoints.'),
      Q('Which normal form specifically removes partial dependencies on a composite candidate key?', ['1NF', '2NF', '3NF', 'BCNF only'], 1, '2NF requires 1NF and removes partial dependencies of non-prime attributes on candidate keys.'),
      Q('A program uses 4 KiB pages. How many bytes are in one page?', ['1,024', '2,048', '4,096', '4,000,000'], 2, 'A kibibyte is 1,024 bytes, so 4 KiB is 4 × 1,024 = 4,096 bytes.'),
      Q('Which Java construct is designed to ensure cleanup code runs after a try block, including when an exception is thrown?', ['finally', 'implements', 'transient', 'volatile'], 0, 'A finally block normally runs after try/catch control flow, including exceptional completion.'),
      Q('What is 15% of 240?', ['24', '30', '36', '40'], 2, '10% of 240 is 24 and 5% is 12; together they equal 36.'),
      Q('Which SQL constraint requires values in a column to be unique across rows?', ['UNIQUE', 'DEFAULT', 'CHECK only', 'NOT NULL'], 0, 'A UNIQUE constraint prevents duplicate values in the constrained column set.'),
      Q('What is the time complexity of inserting a node at the head of a singly linked list when the head pointer is known?', ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], 0, 'The new node points to the current head and then becomes the head, requiring constant-time pointer updates.'),
      Q('Which protocol is commonly used to securely access a remote command-line shell?', ['SSH', 'HTTP', 'DHCP', 'ARP'], 0, 'SSH provides an encrypted protocol for remote login and command execution.'),
      Q('Which concurrency problem occurs when the outcome depends on the unpredictable timing of accesses to shared state?', ['Race condition', 'Page fault', 'Syntax error', 'Cache hit'], 0, 'A race condition occurs when concurrent operations access shared state and the result depends on their timing.'),
      Q('What is the decimal value of binary 1011?', ['9', '10', '11', '13'], 2, 'Binary 1011 equals 1×8 + 0×4 + 1×2 + 1×1 = 11.'),
      Q('In Java, which collection interface represents an ordered sequence that permits positional access?', ['List', 'Set', 'Map', 'Runnable'], 0, 'List is an ordered collection whose elements can be accessed by index.'),
      Q('Which statement about a primary key is correct?', ['It uniquely identifies a row and cannot contain NULL', 'It may contain duplicate values', 'Every table must have exactly two primary keys', 'It must always be a string'], 0, 'A primary key enforces unique row identification and its columns are non-null.'),
      Q('A process waiting for an I/O operation to complete is commonly in the blocked/waiting state.', ['True', 'False'], 0, 'A process that cannot proceed until an event such as I/O completion occurs is waiting or blocked.', 'true_false')
    ]
  },
  {
    key: 'placement-full-mock-01', title: 'Full Placement Mock 01', category: 'placement-mock-tests', topic: 'Full Placement Mocks', difficulty: 'full_mock', duration: 60, targetQuestionCount: 40,
    description: 'A 40-question original placement practice mock across programming, core CS, quantitative aptitude, and code output. Not an actual company exam.',
    questions: [
      Q('Which Java primitive type stores a 64-bit signed integer?', ['int', 'long', 'short', 'char'], 1, 'Java long is a 64-bit signed integral primitive; int is 32-bit.'),
      Q('For two Java String references, what does equals normally compare?', ['Object identity only', 'String contents', 'String capacity', 'The references’ declared types'], 1, 'String overrides equals to compare character contents; == compares reference identity.'),
      Q('What is printed?\nint n = 4;\nSystem.out.println(n++ + ++n);', ['8', '9', '10', 'Compilation error'], 2, 'Evaluation is left to right: n++ contributes 4 and increments to 5; ++n increments to 6 and contributes 6; the sum is 10.', 'code_output'),
      Q('Defining two methods with the same name but different parameter lists is:', ['Overloading', 'Overriding', 'Encapsulation', 'Casting'], 0, 'Overloading uses distinct parameter lists and is resolved at compile time.'),
      Q('A Java class provides implementations for an interface by using which keyword?', ['extends', 'implements', 'instanceof', 'super'], 1, 'Classes use implements to declare that they provide an interface’s contract.'),
      Q('Which statement about a finally block is generally correct?', ['It is used for cleanup after try/catch control flow', 'It runs only when no exception occurs', 'It changes checked exceptions into unchecked ones', 'It is a constructor'], 0, 'A finally block is intended for cleanup and normally executes whether the try block completes normally or exceptionally.'),
      Q('Which Java collection interface represents an ordered sequence that supports positional access?', ['List', 'Set', 'Map', 'Queue only'], 0, 'List is an ordered collection whose elements can be accessed by index.'),
      Q('For an array of length n in Java, which is the final valid index?', ['n', 'n - 1', 'n + 1', '1'], 1, 'Java arrays are zero-indexed, so valid indexes range from 0 through n - 1.'),
      Q('What is printed by Java integer division 17 / 5?', ['3', '3.4', '4', 'Compilation error'], 0, 'When both operands are integers, Java integer division discards the fractional part.'),
      Q('Which SQL clause filters individual rows before grouping?', ['WHERE', 'HAVING', 'ORDER BY', 'UNION'], 0, 'WHERE applies to input rows; HAVING filters groups after aggregation.'),
      Q('Which join returns matching rows from both tables and excludes non-matching rows?', ['INNER JOIN', 'CROSS JOIN', 'FULL OUTER JOIN', 'LEFT JOIN'], 0, 'An INNER JOIN keeps rows that satisfy the join condition on both sides.'),
      Q('Which expression counts every row, including rows where a particular column is NULL?', ['COUNT(*)', 'COUNT(column_name)', 'SUM(*)', 'COUNT(NULL)'], 0, 'COUNT(*) counts rows; COUNT(column_name) ignores NULL values in that expression.'),
      Q('How should SQL test whether a column is NULL?', ['column = NULL', 'column IS NULL', 'column == NULL', 'column EQUALS NULL'], 1, 'SQL uses IS NULL because NULL represents an unknown value and does not compare equal with =.'),
      Q('What does a primary key guarantee?', ['Unique, non-NULL identification of each row', 'Rows are physically sorted by the key', 'The table contains no foreign keys', 'Every value is numeric'], 0, 'A primary key uniquely identifies each row and its columns cannot be NULL.'),
      Q('A foreign key typically enforces which rule?', ['Referenced values exist in the referenced key', 'All values in a table are unique', 'Rows are stored in sorted order', 'A column cannot contain NULL'], 0, 'A foreign key enforces referential integrity between referencing and referenced rows.'),
      Q('Which clause filters groups using an aggregate such as COUNT(*) > 1?', ['HAVING', 'WHERE', 'FROM', 'VALUES'], 0, 'HAVING filters grouped results and may use aggregate expressions.'),
      Q('Which normal form removes partial dependencies on a proper subset of a composite candidate key?', ['1NF', '2NF', '3NF', 'BCNF'], 1, 'Second Normal Form requires 1NF and removes partial dependencies of non-prime attributes on candidate keys.'),
      Q('First Normal Form requires each row-column position to contain:', ['A single value from its domain', 'A list of repeated values', 'A serialized table', 'A foreign key'], 0, '1NF rules out repeating groups and requires atomic values in each cell.'),
      Q('Which ACID property means a committed transaction survives a system failure?', ['Atomicity', 'Consistency', 'Isolation', 'Durability'], 3, 'Durability means committed changes persist despite failures.'),
      Q('What is the worst-case time complexity of binary search on a sorted array?', ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], 1, 'Binary search halves the remaining search interval on each comparison.'),
      Q('Which data structure is naturally used for Last In, First Out behavior?', ['Queue', 'Stack', 'Graph', 'Hash map'], 1, 'A stack removes the most recently inserted item first.'),
      Q('When the head pointer is known, inserting a node at the head of a singly linked list takes:', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], 0, 'The insertion changes a constant number of pointers, independent of list length.'),
      Q('A hash table lookup is typically expected to take what time with a suitable hash function and controlled load factor?', ['O(1) average', 'O(log n) always', 'O(n log n) average', 'O(2ⁿ)'], 0, 'With a suitable hash function and controlled load factor, lookup is expected O(1) on average, though worst-case behavior can be linear.'),
      Q('A stable sorting algorithm preserves what for equal-key elements?', ['Their original relative order', 'Their memory addresses', 'Their original array indexes after every move', 'Their key values by changing them'], 0, 'Stability means equal-key elements retain their original relative order.'),
      Q('What is essential to prevent infinite recursion?', ['A reachable base case', 'A global variable', 'A sorted input', 'A hash function'], 0, 'A recursive computation needs a base case that stops further recursive calls.'),
      Q('In a sorted array, which technique can find a pair summing to a target in O(n) time?', ['Two pointers moving inward', 'Nested loops over every pair', 'Depth-first search', 'Heap sort followed by all pairs'], 0, 'With sorted values, two pointers move based on whether their sum is below or above the target.'),
      Q('What is the time complexity of accessing an array element by a valid index?', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], 0, 'Array index access computes the element location directly and takes constant time.'),
      Q('A process that is ready to run but waiting for CPU allocation is in which state?', ['Ready', 'Blocked', 'Terminated', 'Suspended only'], 0, 'A ready process can run but is waiting for the scheduler to assign a CPU.'),
      Q('What does a context switch do?', ['Saves one task state and restores another', 'Compiles a process into source code', 'Deletes a process from storage', 'Changes a file permission'], 0, 'A context switch saves the execution state of one task and restores another task’s state.'),
      Q('In Round Robin scheduling, what does the time quantum represent?', ['A bounded CPU time slice', 'The number of ready processes', 'A page size', 'The duration of a disk seek'], 0, 'Each ready process receives a bounded time slice before an unfinished process is preempted.'),
      Q('Which item is one of the four Coffman conditions associated with deadlock?', ['Circular wait', 'Cache coherence', 'Dynamic linking', 'Page replacement'], 0, 'The four conditions are mutual exclusion, hold and wait, no preemption, and circular wait.'),
      Q('Virtual memory allows a process to use:', ['An address space larger than currently resident physical memory', 'Only CPU cache addresses', 'A different instruction set', 'No secondary storage'], 0, 'Virtual memory provides an address-space abstraction and can keep only part of a process resident in physical memory.'),
      Q('Which OSI layer is primarily responsible for routing packets between networks?', ['Data Link', 'Network', 'Transport', 'Presentation'], 1, 'The Network layer handles logical addressing and forwarding between networks.'),
      Q('Which transport protocol provides a reliable, ordered byte stream?', ['UDP', 'TCP', 'ARP', 'ICMP'], 1, 'TCP uses sequence numbers, acknowledgements, and retransmission to provide reliable ordered delivery.'),
      Q('What service does DNS primarily provide?', ['Name-to-record resolution', 'Encryption of all packets', 'Automatic CPU scheduling', 'Ethernet frame switching'], 0, 'DNS resolves names to records such as IPv4/IPv6 addresses and mail-routing data.'),
      Q('HTTPS protects HTTP communication in normal deployments by using:', ['TLS', 'ARP', 'DHCP', 'FTP'], 0, 'HTTPS is HTTP carried over TLS, which provides confidentiality, integrity, and endpoint authentication.'),
      Q('What is 15% of 240?', ['24', '30', '36', '48'], 2, 'Ten percent is 24 and five percent is 12, so fifteen percent is 36.'),
      Q('A can finish a job in 10 days and B in 15 days at constant rates. How long do they take working together?', ['5 days', '6 days', '8 days', '12 days'], 1, 'Their combined rate is 1/10 + 1/15 = 1/6 of the job per day.'),
      Q('A fair six-sided die is rolled once. What is the probability of rolling an even number?', ['1/6', '1/3', '1/2', '2/3'], 2, 'Three of the six equally likely outcomes are even, giving 3/6 = 1/2.'),
      Q('How many distinct arrangements can be made from the letters A, B, and C when each is used once?', ['3', '6', '9', '27'], 1, 'There are 3! arrangements, which equals 3 × 2 × 1 = 6.')
    ]
  },
  {
    key: 'company-placement-aptitude-logical', title: 'Aptitude and Logical Reasoning', category: 'company-placement-preparation', topic: 'Aptitude and Logical Reasoning', difficulty: 'medium', duration: 15,
    description: 'Placement-style practice in quantitative aptitude and logical reasoning.',
    questions: [
      Q('A product priced at 800 is discounted by 15%. What is its sale price?', ['640', '660', '680', '720'], 2, 'The discount is 120, so the sale price is 800 − 120 = 680.'),
      Q('A finishes a task in 12 days and B in 18 days. How long do they take working together?', ['6 days', '7.2 days', '8 days', '15 days'], 1, 'Their combined rate is 1/12 + 1/18 = 5/36 task per day, so the time is 36/5 = 7.2 days.'),
      Q('A car travels 150 km in 2.5 hours. What is its average speed?', ['50 km/h', '55 km/h', '60 km/h', '65 km/h'], 2, 'Average speed is distance divided by time: 150 ÷ 2.5 = 60 km/h.'),
      Q('The average of 12, 16, 20, and 24 is:', ['16', '18', '20', '22'], 1, 'Their sum is 72, and 72 ÷ 4 = 18.'),
      Q('What is the simple interest on 5,000 at 8% per year for 2 years?', ['600', '700', '800', '900'], 2, 'Simple interest is principal × rate × time = 5,000 × 0.08 × 2 = 800.'),
      Q('Find the next number: 3, 7, 15, 31, ...', ['47', '55', '62', '63'], 3, 'Each term is twice the previous term plus one; 31 × 2 + 1 = 63.'),
      Q('All analysts are graduates. Mira is an analyst. Which conclusion follows?', ['Mira is a graduate', 'All graduates are analysts', 'Mira is not a graduate', 'No conclusion follows'], 0, 'Since every analyst is a graduate and Mira is an analyst, Mira is a graduate.'),
      Q('A bag has 3 red and 2 blue balls. What is the probability of drawing a blue ball?', ['1/5', '2/5', '1/2', '3/5'], 1, 'Two of the five balls are blue, so the probability is 2/5.'),
      Q('If 5 machines make 5 parts in 5 minutes at the same rate, how many minutes do 10 machines need to make 10 parts?', ['5', '10', '15', '25'], 0, 'Each machine makes one part in five minutes; ten machines make ten parts in five minutes.'),
      Q('A number increased by 20% becomes 96. What was the original number?', ['72', '76', '80', '84'], 2, 'The original multiplied by 1.2 is 96, so the original is 96 ÷ 1.2 = 80.')
    ]
  },
  {
    key: 'company-java-placement-test', title: 'Java Placement Test', category: 'company-placement-preparation', topic: 'Java Placement Test', difficulty: 'medium', duration: 15,
    description: 'Core Java language and object-oriented programming questions for placement rounds.',
    questions: [
      Q('Which keyword declares a class in Java?', ['class', 'object', 'define', 'struct'], 0, 'The class keyword introduces a class declaration.'),
      Q('Which method signature is the standard Java application entry point?', ['public static void main(String[] args)', 'public void start(String[] args)', 'static int main()', 'private static main(String args)'], 0, 'The Java launcher recognizes a public static main method that accepts a String array and returns void.'),
      Q('Which primitive type stores a 64-bit signed integer?', ['int', 'long', 'short', 'byte'], 1, 'The long primitive is a 64-bit signed integer.'),
      Q('Which keyword makes a class member accessible only within its declaring class?', ['public', 'protected', 'private', 'static'], 2, 'private restricts access to the declaring class, subject to Java nested-class access rules.'),
      Q('What does method overloading require?', ['Same name with different parameter lists', 'Same signature in unrelated classes', 'A different return type only', 'A static method in every class'], 0, 'Overloaded methods share a name but have different parameter lists.'),
      Q('Which keyword allows a class to implement an interface?', ['extends', 'implements', 'instanceof', 'super'], 1, 'A class declares interface implementation with implements.'),
      Q('What is true of Java String objects?', ['They are mutable', 'They are immutable', 'They store only digits', 'They are primitive types'], 1, 'String is immutable; operations that appear to alter it produce another String.'),
      Q('What does an instance field receive by default when it has type int?', ['-1', '0', 'Undefined memory contents', 'Compilation error'], 1, 'An instance int field defaults to zero; local variables do not receive a default value.'),
      Q('Which collection type rejects duplicate elements?', ['List', 'Set', 'ArrayList', 'Deque'], 1, 'The Set contract represents a collection with no duplicate elements.'),
      Q('What does the finally block normally provide?', ['Cleanup code after try/catch control flow', 'A replacement for every catch block', 'A way to declare a subclass', 'A way to restart the JVM'], 0, 'A finally block is used for cleanup and normally executes whether the try block completes normally or exceptionally.')
    ]
  },
  {
    key: 'company-dsa-coding-test', title: 'DSA Coding Test', category: 'company-placement-preparation', topic: 'DSA Coding Test', difficulty: 'medium', duration: 15,
    description: 'Assess algorithm analysis, data structures, and common coding-round techniques.',
    questions: [
      Q('What is the time complexity of binary search on a sorted array?', ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], 1, 'Each comparison halves the search interval, giving logarithmic time.'),
      Q('Which data structure follows Last In, First Out?', ['Queue', 'Stack', 'Heap', 'Graph'], 1, 'A stack removes the most recently added element first.'),
      Q('Which data structure is typically used for breadth-first search?', ['Stack', 'Queue', 'Hash set only', 'Binary search tree'], 1, 'A queue processes discovered vertices in first-in, first-out order.'),
      Q('What is the average-case lookup time for a hash table with a suitable hash function?', ['O(1)', 'O(log n)', 'O(n log n)', 'O(n²)'], 0, 'Hash table lookup is expected O(1) on average with a suitable hash function and controlled load factor.'),
      Q('Which traversal of a binary search tree visits keys in sorted order?', ['Preorder', 'Inorder', 'Postorder', 'Level order only'], 1, 'Inorder traversal visits left subtree, node, then right subtree, producing sorted keys in a BST.'),
      Q('Which technique is suited to finding a pair with a target sum in a sorted array in O(n) time?', ['Two pointers', 'Nested loops', 'Repeated selection sort', 'Depth-first search'], 0, 'Two pointers move inward based on whether their current sum is below or above the target.'),
      Q('What is the worst-case time complexity of merge sort?', ['O(log n)', 'O(n)', 'O(n log n)', 'O(n²)'], 2, 'Merge sort divides the input into logarithmically many levels and merges n elements per level.'),
      Q('A recursive algorithm needs which feature to stop making recursive calls?', ['A base case', 'A global variable', 'A sorted input', 'A hash collision'], 0, 'A reachable base case terminates the recursive chain.'),
      Q('Which data structure is commonly used to implement a priority queue efficiently?', ['Binary heap', 'Linked list only', 'Stack', 'Trie'], 0, 'A binary heap supports efficient insertion and removal of the highest- or lowest-priority item.'),
      Q('For a graph with V vertices and E edges, what is the time complexity of adjacency-list BFS?', ['O(V + E)', 'O(V² + E)', 'O(log V)', 'O(E²)'], 0, 'BFS visits each vertex and examines each edge a constant number of times.')
    ]
  },
  {
    key: 'company-dbms-placement-test', title: 'DBMS Placement Test', category: 'company-placement-preparation', topic: 'DBMS Placement Test', difficulty: 'medium', duration: 15,
    description: 'Practice relational database, SQL, normalization, and transaction fundamentals.',
    questions: [
      Q('Which SQL clause filters rows before grouping?', ['WHERE', 'HAVING', 'ORDER BY', 'UNION'], 0, 'WHERE filters individual rows before GROUP BY aggregation.'),
      Q('Which SQL clause filters groups after aggregation?', ['WHERE', 'HAVING', 'FROM', 'VALUES'], 1, 'HAVING applies conditions to groups formed by GROUP BY.'),
      Q('What does a primary key guarantee?', ['Unique, non-NULL row identification', 'Duplicate values are allowed', 'Every value references another table', 'Rows are physically sorted'], 0, 'A primary key uniquely identifies each row and cannot contain NULL.'),
      Q('Which normal form removes partial dependencies on a candidate key?', ['1NF', '2NF', '3NF', '4NF'], 1, 'Second Normal Form requires 1NF and removes partial dependencies of non-prime attributes on candidate keys.'),
      Q('A foreign key primarily enforces:', ['Referential integrity', 'Column sorting', 'Query caching', 'Data compression'], 0, 'A foreign key constrains references to valid key values in a related table.'),
      Q('What does an INNER JOIN return?', ['Rows with matching join values in both inputs', 'Every row from the left input', 'Every row from both inputs regardless of match', 'Only unmatched rows'], 0, 'An INNER JOIN returns rows that satisfy the join condition in both tables.'),
      Q('Which ACID property means a transaction is all-or-nothing?', ['Atomicity', 'Consistency', 'Isolation', 'Durability'], 0, 'Atomicity ensures that all transaction operations occur or none do.'),
      Q('Which command makes the current transaction changes permanent?', ['COMMIT', 'ROLLBACK', 'SAVEPOINT', 'GRANT'], 0, 'COMMIT ends a transaction by making its changes permanent.'),
      Q('What does COUNT(column_name) do with NULL values in that column?', ['Ignores them', 'Counts each as zero', 'Raises an error', 'Counts each twice'], 0, 'COUNT(expression) counts non-NULL expression values.'),
      Q('Which index structure is commonly used to support ordered range searches?', ['B-tree', 'Stack', 'Queue', 'Bloom filter only'], 0, 'B-tree indexes maintain ordered keys and support efficient range scans.')
    ]
  },
  {
    key: 'company-computer-networks', title: 'Computer Networks Placement Test', category: 'company-placement-preparation', topic: 'Computer Networks', difficulty: 'medium', duration: 15,
    description: 'Review networking layers, addressing, transport, and common protocols.',
    questions: [
      Q('Which OSI layer is responsible for routing between networks?', ['Data Link', 'Network', 'Transport', 'Session'], 1, 'The Network layer handles logical addressing and forwarding between networks.'),
      Q('Which transport protocol provides a reliable, ordered byte stream?', ['UDP', 'TCP', 'ARP', 'ICMP'], 1, 'TCP uses sequence numbers, acknowledgements, and retransmission for reliable ordered delivery.'),
      Q('What service does DNS primarily provide?', ['Name-to-record resolution', 'Dynamic CPU allocation', 'Packet encryption by default', 'Ethernet switching'], 0, 'DNS resolves names to records such as IPv4 and IPv6 addresses.'),
      Q('Which protocol commonly assigns IP configuration automatically to hosts?', ['DHCP', 'SMTP', 'SSH', 'SNMP'], 0, 'DHCP leases IP configuration and related network settings to clients.'),
      Q('What is the default TCP port for HTTPS?', ['25', '53', '80', '443'], 3, 'HTTPS commonly uses TCP port 443.'),
      Q('Which address is used for delivery within a local Ethernet link?', ['MAC address', 'URL path', 'Process ID', 'DNS alias'], 0, 'Ethernet frames use MAC addresses for local-link delivery.'),
      Q('What is the main purpose of a subnet mask?', ['Identify network and host portions of an IP address', 'Encrypt application data', 'Assign a domain name', 'Choose a TCP port'], 0, 'A subnet mask marks which IP address bits identify the network prefix.'),
      Q('What does a TCP three-way handshake establish?', ['A TCP connection', 'A DNS zone transfer', 'An Ethernet VLAN', 'A DHCP lease renewal only'], 0, 'SYN, SYN-ACK, and ACK establish TCP connection state.'),
      Q('Which protocol maps an IPv4 address to a link-layer address on a local network?', ['ARP', 'DNS', 'TLS', 'NTP'], 0, 'ARP resolves an IPv4 address to a local-link hardware address.'),
      Q('What does a router primarily do?', ['Forward packets between IP networks', 'Render web pages', 'Compile source code', 'Store database indexes'], 0, 'Routers forward packets between networks using routing information.')
    ]
  },
  {
    key: 'company-operating-systems', title: 'Operating Systems Placement Test', category: 'company-placement-preparation', topic: 'Operating Systems', difficulty: 'medium', duration: 15,
    description: 'Test operating-system concepts in processes, memory, scheduling, and synchronization.',
    questions: [
      Q('A process waiting for CPU time while able to run is in which state?', ['Ready', 'Blocked', 'Terminated', 'New only'], 0, 'A ready process can run but is waiting for CPU scheduling.'),
      Q('What is a context switch?', ['Saving one task state and restoring another', 'Compiling source code', 'Moving a file to another disk', 'Changing a process name'], 0, 'A context switch saves the execution state of one task and restores another.'),
      Q('Which scheduling algorithm gives each ready process a bounded time slice?', ['Round Robin', 'First-Come, First-Served only', 'Shortest Job First only', 'Batch sorting'], 0, 'Round Robin cycles through ready processes with a time quantum.'),
      Q('Which condition is one of the four Coffman conditions for deadlock?', ['Circular wait', 'Cache hit', 'Dynamic linking', 'Page locality'], 0, 'Circular wait is one of the four necessary Coffman conditions.'),
      Q('Threads in the same process typically share:', ['The process address space', 'Their own stack', 'Their own instruction pointer', 'Their own register set'], 0, 'Threads share process resources such as the address space, while each thread has its own stack and execution state.'),
      Q('What does virtual memory allow?', ['A process address space larger than currently resident physical memory', 'Every process to use one shared stack', 'The CPU to run without instructions', 'Disk storage to act as a cache only'], 0, 'Virtual memory provides an address-space abstraction and permits pages to be nonresident.'),
      Q('Which synchronization primitive can limit concurrent access using a counter?', ['Semaphore', 'Page table', 'File descriptor', 'Program counter'], 0, 'A semaphore uses state or a counter to coordinate access and signaling.'),
      Q('What is a page fault?', ['A reference to a page that is not currently mapped as resident', 'A failed CPU instruction decode', 'A disk partition format', 'A scheduler priority change'], 0, 'A page fault occurs when a process references a page that needs operating-system handling, often because it is not resident.'),
      Q('Which memory allocation strategy can suffer external fragmentation?', ['Variable-sized contiguous allocation', 'Fixed-size paging', 'Register allocation', 'Instruction pipelining'], 0, 'Variable-sized contiguous allocations can leave separated free holes that cause external fragmentation.'),
      Q('What is the purpose of a mutex?', ['Provide mutual exclusion for a critical section', 'Translate domain names', 'Schedule disk blocks', 'Replace virtual addresses'], 0, 'A mutex allows one thread at a time to hold a lock protecting shared state.')
    ]
  },
  {
    key: 'company-mixed-assessment', title: 'Mixed Company Assessment', category: 'company-placement-preparation', topic: 'Mixed Company Assessment', difficulty: 'medium', duration: 15,
    description: 'A balanced placement screening across aptitude, programming, databases, and core CS.',
    questions: [
      Q('What is 25% of 360?', ['80', '85', '90', '95'], 2, 'One quarter of 360 is 90.'),
      Q('Which Java keyword declares a class?', ['class', 'implements', 'package', 'import'], 0, 'The class keyword introduces a class declaration.'),
      Q('Which data structure follows First In, First Out?', ['Stack', 'Queue', 'Heap', 'Tree'], 1, 'A queue removes elements in the order they were added.'),
      Q('Which SQL command retrieves rows from a table?', ['SELECT', 'INSERT', 'UPDATE', 'DROP'], 0, 'SELECT queries data from one or more tables.'),
      Q('Which protocol provides reliable ordered transport?', ['UDP', 'TCP', 'ARP', 'DNS'], 1, 'TCP provides reliable, ordered byte-stream transport.'),
      Q('Which ACID property means committed data survives a failure?', ['Atomicity', 'Consistency', 'Isolation', 'Durability'], 3, 'Durability ensures committed changes persist.'),
      Q('Which OSI layer routes packets between networks?', ['Physical', 'Network', 'Session', 'Presentation'], 1, 'The Network layer forwards packets between networks.'),
      Q('Which Java type represents a true/false value?', ['boolean', 'byte', 'char', 'double'], 0, 'Java boolean represents true or false.'),
      Q('What is binary 1010 in decimal?', ['8', '9', '10', '12'], 2, 'Binary 1010 equals 8 + 2 = 10.'),
      Q('Which scheduling approach assigns a time quantum to each runnable process?', ['Round Robin', 'FCFS only', 'Non-preemptive shortest job only', 'Static linking'], 0, 'Round Robin uses a time quantum and rotates among runnable processes.')
    ]
  },
  {
    key: 'interview-java-questions', title: 'Java Interview Questions', category: 'interview-preparation', topic: 'Java Interview Questions', difficulty: 'medium', duration: 15,
    description: 'Review Java object-oriented concepts, language behavior, and collections.',
    questions: [
      Q('What is the key idea of encapsulation?', ['Bundle state and behavior while controlling access', 'Make every field public', 'Prevent all object creation', 'Store every class in one file'], 0, 'Encapsulation combines data and behavior and controls access through a class interface.'),
      Q('What is method overriding?', ['A subclass supplies an implementation with a compatible signature', 'Two methods in one class have different parameter lists', 'A field changes its type at runtime', 'A class implements two constructors at once'], 0, 'Overriding replaces an inherited instance method implementation with a compatible subclass implementation.'),
      Q('Can a Java class extend more than one class directly?', ['Yes, without limit', 'Yes, exactly two', 'No, a class has one direct superclass', 'Only when both are abstract'], 2, 'Java classes have a single direct superclass; they can implement multiple interfaces.'),
      Q('What does the final modifier on a variable prevent after initialization?', ['Reassignment', 'Reading its value', 'Method calls', 'Object construction'], 0, 'A final variable can be assigned once and cannot then be reassigned.'),
      Q('What does == compare for two object references?', ['Reference identity', 'Always their field values', 'Their class names only', 'Their serialized size'], 0, 'For object references, == tests whether both references identify the same object.'),
      Q('Which collection interface prohibits duplicate elements?', ['List', 'Set', 'Queue', 'Deque'], 1, 'A Set models a collection without duplicate elements.'),
      Q('What is the purpose of a Java constructor?', ['Initialize a newly created object', 'Return a value from every method', 'Destroy the JVM', 'Declare an interface'], 0, 'A constructor initializes an instance when it is created.'),
      Q('Which checked exception category is commonly associated with file I/O?', ['IOException', 'ArithmeticException', 'NullPointerException', 'ClassCastException'], 0, 'Many file and stream operations declare IOException.'),
      Q('What does polymorphism allow in object-oriented programming?', ['A common type reference to invoke behavior implemented by different concrete types', 'A variable to have two primitive types at once', 'Every method to be static', 'An object to bypass type checking'], 0, 'Polymorphism lets implementations of a common type provide behavior selected at runtime.'),
      Q('What does try-with-resources do for an AutoCloseable resource?', ['Closes it automatically when the block exits', 'Retries every failed operation', 'Makes it globally accessible', 'Suppresses all exceptions'], 0, 'Try-with-resources closes declared AutoCloseable resources when control exits the block.')
    ]
  },
  {
    key: 'interview-sql-questions', title: 'SQL Interview Questions', category: 'interview-preparation', topic: 'SQL Interview Questions', difficulty: 'medium', duration: 15,
    description: 'Practice common SQL query, join, aggregation, and constraint concepts.',
    questions: [
      Q('Which clause filters rows before grouping?', ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'], 0, 'WHERE filters rows before grouping and aggregation.'),
      Q('Which clause filters aggregated groups?', ['WHERE', 'HAVING', 'FROM', 'JOIN'], 1, 'HAVING filters groups after aggregation.'),
      Q('What does LEFT JOIN preserve?', ['Every row from the left input', 'Only rows from the right input', 'Only rows matching on both sides', 'Only rows with NULL keys'], 0, 'LEFT JOIN preserves every left-side row and returns matching right-side values where available.'),
      Q('Which aggregate counts non-NULL values of an expression?', ['COUNT(expression)', 'SUM(expression)', 'AVG(expression)', 'MAX(expression)'], 0, 'COUNT(expression) counts values that are not NULL.'),
      Q('Which clause orders query results?', ['ORDER BY', 'GROUP BY', 'HAVING', 'VALUES'], 0, 'ORDER BY sorts the result set by selected expressions.'),
      Q('What does DISTINCT do in a SELECT list?', ['Removes duplicate result rows for the selected expressions', 'Sorts all results', 'Locks the table', 'Changes NULL to zero'], 0, 'DISTINCT eliminates duplicate result rows based on the selected expressions.'),
      Q('Which operator tests whether a value matches any value in a list?', ['IN', 'LIKE', 'IS NULL', 'BETWEEN only'], 0, 'IN tests whether an expression equals one of the listed values.'),
      Q('Which constraint prevents duplicate values in a column or column set?', ['UNIQUE', 'DEFAULT', 'CHECK only', 'INDEX name'], 0, 'A UNIQUE constraint prevents duplicate values in its constrained key.'),
      Q('What does a correlated subquery do?', ['References a value from the outer query', 'Always runs only once', 'Creates a permanent table', 'Replaces every join'], 0, 'A correlated subquery refers to columns from the outer query and is evaluated in that context.'),
      Q('Which command undoes uncommitted transaction changes?', ['ROLLBACK', 'COMMIT', 'GRANT', 'ALTER'], 0, 'ROLLBACK discards changes made in the current uncommitted transaction.')
    ]
  },
  {
    key: 'interview-dbms-questions', title: 'DBMS Interview Questions', category: 'interview-preparation', topic: 'DBMS Interview Questions', difficulty: 'medium', duration: 15,
    description: 'Review relational design, normalization, indexes, and transaction properties.',
    questions: [
      Q('What is a candidate key?', ['A minimal attribute set that uniquely identifies a row', 'Any nullable column', 'A key that must reference another table', 'A display-only field'], 0, 'A candidate key is a minimal superkey: it uniquely identifies rows and has no removable attribute.'),
      Q('Which normal form removes transitive dependencies of non-key attributes?', ['1NF', '2NF', '3NF', '4NF'], 2, 'Third Normal Form addresses transitive dependencies of non-key attributes on candidate keys.'),
      Q('What does a database index primarily improve?', ['Lookup and retrieval for suitable queries', 'The logical correctness of all updates', 'The maximum row size', 'The number of columns'], 0, 'Indexes can speed suitable retrieval operations, with storage and write costs.'),
      Q('Which ACID property isolates concurrent transactions from interfering with one another?', ['Atomicity', 'Consistency', 'Isolation', 'Durability'], 2, 'Isolation governs how concurrent transactions observe each other’s work.'),
      Q('What is a deadlock in transaction processing?', ['Transactions wait cyclically for resources held by one another', 'A query returns zero rows', 'An index contains sorted keys', 'A transaction commits twice'], 0, 'A deadlock occurs when transactions form a wait cycle and none can proceed.'),
      Q('Which relationship cardinality means one row can relate to many rows in another table?', ['One-to-many', 'One-to-one only', 'Many-to-one only', 'No relationship'], 0, 'In a one-to-many relationship, one entity can be associated with multiple entities on the other side.'),
      Q('What does a foreign key reference?', ['A candidate or primary key in a related table', 'A query execution plan', 'A database user password', 'A transaction timestamp only'], 0, 'A foreign key references a key in a related table to enforce referential integrity.'),
      Q('Which operation combines rows from relations based on a matching condition?', ['Join', 'Projection', 'Rename', 'Division only'], 0, 'A join combines rows from relations according to a condition.'),
      Q('What is the purpose of a transaction log?', ['Record changes needed for recovery and durability', 'Store only query output formatting', 'Replace table constraints', 'Hold client-side passwords'], 0, 'A transaction log records changes used for recovery and durable commit handling.'),
      Q('What does a database view usually represent?', ['A named query presented like a virtual table', 'A duplicate physical disk', 'A transaction lock', 'A backup password'], 0, 'A view is a named query that can be queried like a virtual table.')
    ]
  },
  {
    key: 'interview-dsa-questions', title: 'DSA Interview Questions', category: 'interview-preparation', topic: 'DSA Interview Questions', difficulty: 'medium', duration: 15,
    description: 'Review common algorithmic complexity, data structures, and problem-solving concepts.',
    questions: [
      Q('What is the time complexity of accessing an array element by index?', ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], 0, 'Array indexing computes the element location directly.'),
      Q('Which data structure is commonly used for iterative depth-first search?', ['Stack', 'Queue', 'Priority queue', 'Disjoint set only'], 0, 'A stack stores vertices whose unexplored neighbors are processed next.'),
      Q('What is the average-case time complexity of quicksort?', ['O(log n)', 'O(n)', 'O(n log n)', 'O(n² log n)'], 2, 'With reasonably balanced partitions, quicksort takes O(n log n) average time.'),
      Q('Which data structure supports efficient minimum extraction in a typical priority queue?', ['Min-heap', 'Stack', 'Unsorted array only', 'Trie'], 0, 'A min-heap keeps the smallest key at its root for efficient extraction.'),
      Q('What does a hash collision mean?', ['Different keys map to the same hash-table location or bucket', 'Two arrays have equal lengths', 'A tree has no leaves', 'A queue becomes empty'], 0, 'A collision occurs when distinct keys map to the same bucket or slot.'),
      Q('Which approach stores results of overlapping subproblems to avoid repeated work?', ['Dynamic programming', 'Linear search', 'Selection sort', 'Breadth-first traversal only'], 0, 'Dynamic programming reuses stored subproblem results.'),
      Q('What is the worst-case lookup time in a highly unbalanced binary search tree?', ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], 2, 'An unbalanced tree can degenerate into a chain, requiring linear lookup time.'),
      Q('Which traversal of a graph explores the frontier level by level?', ['Breadth-first search', 'Depth-first search', 'Inorder traversal', 'Heapify'], 0, 'Breadth-first search explores vertices in increasing distance from the start vertex.'),
      Q('What is a stable sorting algorithm?', ['One that preserves the relative order of equal-key items', 'One that never compares values', 'One that uses no memory', 'One that always runs in O(1)'], 0, 'Stability preserves the input relative order of equal-key elements.'),
      Q('What is the space complexity of an adjacency list for a graph?', ['O(V + E)', 'O(V²) always', 'O(log V)', 'O(E²)'], 0, 'An adjacency list stores vertices and their edges, requiring O(V + E) space.')
    ]
  },
  {
    key: 'interview-hr-preparation', title: 'HR Interview Preparation', category: 'interview-preparation', topic: 'HR Interview Preparation', difficulty: 'easy', duration: 15,
    description: 'Prepare for professional communication, teamwork, and behavioral interview scenarios.',
    questions: [
      Q('When asked to describe a work challenge, which response is most effective?', ['Explain the situation, your actions, and the outcome', 'Blame a teammate without context', 'Give an unrelated personal story', 'Avoid describing your role'], 0, 'A structured response that explains context, actions, and outcome makes your contribution clear.'),
      Q('What is a professional way to discuss a skill you are still developing?', ['Describe the skill and the concrete steps you are taking to improve it', 'Claim you have no weaknesses', 'Dismiss the question', 'Criticize a former manager'], 0, 'Honest self-awareness paired with an improvement plan demonstrates accountability.'),
      Q('If a question is unclear, what should you do?', ['Ask a brief clarifying question', 'Guess and answer a different question', 'Interrupt the interviewer', 'End the interview'], 0, 'Clarifying the question helps you provide a relevant and accurate answer.'),
      Q('What is a constructive first step when teammates disagree?', ['Listen to each view and clarify the shared goal', 'Ignore the disagreement', 'Escalate immediately without discussion', 'Make the decision personal'], 0, 'Listening and clarifying objectives helps resolve disagreements constructively.'),
      Q('Which is a strong way to answer “Why do you want this role?”', ['Connect your skills and interests to the role and organization', 'Say only that any job is acceptable', 'Focus on unrelated complaints', 'Avoid mentioning the role'], 0, 'A specific link between your interests, skills, and the role shows preparation.'),
      Q('What should you do if you do not know an answer?', ['Be transparent and explain how you would find or reason it out', 'Invent a confident-sounding fact', 'Criticize the question', 'Leave without responding'], 0, 'Honesty and a clear problem-solving approach are better than guessing presented as fact.'),
      Q('What is an appropriate way to receive constructive feedback?', ['Listen, ask clarifying questions, and identify an action', 'Reject it immediately', 'Interrupt to assign blame', 'Ignore it permanently'], 0, 'Listening and turning feedback into an action plan demonstrates a growth mindset.'),
      Q('Before an interview, which preparation is most useful?', ['Review the role and prepare relevant examples and questions', 'Memorize unrelated facts only', 'Avoid learning about the organization', 'Arrive without checking the time'], 0, 'Role-specific research and examples make answers relevant and thoughtful.'),
      Q('When discussing a team achievement, how should you describe your contribution?', ['Credit the team and clearly state your own role', 'Claim all credit regardless of contributions', 'Avoid explaining what happened', 'Name colleagues to criticize them'], 0, 'Balanced credit shows collaboration while making your contribution understandable.'),
      Q('What is a suitable closing question for an interviewer?', ['Ask about role expectations or next steps', 'Ask for confidential data', 'Demand an immediate offer', 'Ask nothing because questions are prohibited'], 0, 'Relevant questions about expectations or next steps show engagement and professionalism.')
    ]
  },
  {
    key: 'interview-technical-round', title: 'Technical Interview Round', category: 'interview-preparation', topic: 'Technical Interview Round', difficulty: 'medium', duration: 15,
    description: 'Practice explaining technical trade-offs, testing, debugging, and system fundamentals.',
    questions: [
      Q('When solving a coding problem in an interview, what is a useful first step?', ['Clarify requirements and constraints', 'Start coding before understanding inputs', 'Ignore edge cases', 'Choose a data structure at random'], 0, 'Clarifying requirements and constraints guides a correct approach.'),
      Q('What should a unit test primarily verify?', ['A small unit of behavior in isolation', 'Every production server at once', 'Network bandwidth only', 'User account permissions only'], 0, 'Unit tests check focused behavior of a small component, usually in isolation.'),
      Q('Why analyze algorithm complexity?', ['Estimate how resource use grows with input size', 'Determine source-code color', 'Guarantee a program has no bugs', 'Replace functional requirements'], 0, 'Complexity analysis estimates how time or space requirements scale with input size.'),
      Q('What is a useful response when an initial solution is too slow?', ['Identify the bottleneck and consider a more suitable algorithm or data structure', 'Hide the result', 'Remove correctness checks', 'Assume the input is always small'], 0, 'Finding the bottleneck and improving the algorithm preserves correctness while addressing performance.'),
      Q('What is the purpose of an API contract?', ['Define expected requests, responses, and behavior between components', 'Store a database backup', 'Choose a monitor resolution', 'Replace authentication'], 0, 'An API contract documents how clients and services communicate.'),
      Q('Which practice helps prevent SQL injection in application queries?', ['Use parameterized queries', 'Concatenate untrusted input into SQL', 'Disable all database constraints', 'Store queries in comments'], 0, 'Parameterized queries separate data values from SQL syntax.'),
      Q('What does idempotent behavior mean for an operation?', ['Repeating it has the same intended effect as performing it once', 'It always fails on the first call', 'It requires a global lock', 'It changes output randomly'], 0, 'An idempotent operation can be repeated without changing the intended final effect beyond the first application.'),
      Q('What is a race condition?', ['A result that depends on timing of concurrent access to shared state', 'A syntax error in a loop', 'A deterministic sort order', 'A database view'], 0, 'A race condition occurs when concurrent operations interact with shared state and timing affects the result.'),
      Q('Why separate a program into cohesive modules?', ['To isolate responsibilities and make changes easier to reason about', 'To eliminate the need for tests', 'To make every function global', 'To prevent code reuse'], 0, 'Cohesive modules group related responsibilities and reduce the scope of changes.'),
      Q('What is a good debugging approach for a reproducible defect?', ['Create a minimal reproduction and inspect evidence around the failure', 'Change unrelated code until it disappears', 'Suppress the error message', 'Assume the compiler is wrong'], 0, 'A minimal reproduction and evidence-based inspection narrow down the cause.')
    ]
  },
  {
    key: 'interview-programming-fundamentals', title: 'Programming Fundamentals', category: 'interview-preparation', topic: 'Programming Fundamentals', difficulty: 'easy', duration: 15,
    description: 'Review language-independent fundamentals in variables, control flow, functions, and testing.',
    questions: [
      Q('What is a variable?', ['A named storage location or binding for a value', 'A type of network cable', 'A database transaction only', 'A sorting algorithm'], 0, 'A variable names a value or storage location used by a program.'),
      Q('What does a conditional statement do?', ['Selects a path based on a boolean condition', 'Always repeats a block', 'Declares a database index', 'Compiles a program'], 0, 'A conditional chooses which branch to execute based on a condition.'),
      Q('What is the purpose of a loop?', ['Repeat a block of instructions', 'Declare a constant only', 'Create a network connection', 'Store an image'], 0, 'Loops repeat instructions while a condition or iteration remains.'),
      Q('What is a function parameter?', ['An input name declared for a function', 'A return value only', 'A database table', 'An operating-system process'], 0, 'A parameter is a named input a function can receive.'),
      Q('What is a return value?', ['A result a function sends back to its caller', 'A comment in source code', 'A CPU scheduling rule', 'A file permission'], 0, 'A return value is the result provided by a function call.'),
      Q('What is an off-by-one error?', ['A boundary mistake that uses an index or count one step too far or too little', 'A network timeout', 'A missing database table', 'A compiler optimization'], 0, 'Off-by-one errors commonly arise from incorrect loop bounds or index boundaries.'),
      Q('Why use descriptive names for functions and variables?', ['They make intent easier to understand', 'They guarantee faster execution', 'They eliminate all bugs', 'They replace documentation and tests in every case'], 0, 'Descriptive names make code intent easier to follow and maintain.'),
      Q('What is the purpose of an assertion or precondition?', ['State an assumption that should hold at a point in the program', 'Encrypt a network packet', 'Sort a collection', 'Create a user account'], 0, 'Preconditions and assertions express assumptions that should hold before an operation.'),
      Q('What does a compiler generally do?', ['Translates source code into another representation or executable form', 'Schedules database transactions', 'Assigns IP addresses', 'Runs every test automatically'], 0, 'A compiler translates source code into a lower-level or otherwise executable representation.'),
      Q('What is a useful first response to an unexpected program result?', ['Reproduce it and inspect inputs and execution state', 'Change several unrelated lines', 'Delete the test', 'Ignore it if it happens once'], 0, 'Reproducing the result and inspecting evidence helps isolate the cause.')
    ]
  },
  {
    key: 'placement-preparation-quantitative-aptitude', title: 'Quantitative Aptitude', category: 'placement-preparation', topic: 'Quantitative Aptitude', difficulty: 'medium', duration: 20,
    description: 'Practice arithmetic, percentages, rates, probability, and common placement-test calculations.',
    questions: [
      Q('A sum is divided in the ratio 3:5. If the total is 64, what is the smaller share?', ['24', '32', '40', '18'], 0, 'There are eight ratio parts, so each part is 64 ÷ 8 = 8. The smaller share is 3 × 8 = 24.'),
      Q('What simple interest is earned on ₹5,000 at 8% per year for 2 years?', ['₹600', '₹800', '₹900', '₹1,000'], 1, 'Simple interest is principal × rate × time ÷ 100 = 5,000 × 8 × 2 ÷ 100 = ₹800.'),
      Q('Worker A can finish a job in 12 days and worker B in 18 days. How long do they take working together?', ['6 days', '7.2 days', '8 days', '15 days'], 1, 'Their combined daily rate is 1/12 + 1/18 = 5/36 of the job, so the time is 36/5 = 7.2 days.'),
      Q('An item is discounted by 20% and then by a further 10%. What is the total discount from its original price?', ['28%', '30%', '32%', '18%'], 0, 'After the first discount 80% remains; 90% of that is 72%, so the total reduction is 28%.'),
      Q('The average of five numbers is 18. Four of them sum to 68. What is the fifth number?', ['20', '21', '22', '23'], 2, 'The total of all five numbers is 5 × 18 = 90. The remaining number is 90 − 68 = 22.'),
      Q('A car travels 150 km in 2.5 hours at a constant speed. What is its speed?', ['50 km/h', '55 km/h', '60 km/h', '65 km/h'], 2, 'Speed is distance divided by time: 150 ÷ 2.5 = 60 km/h.'),
      Q('What is the compound amount on ₹10,000 after 2 years at 10% per year, compounded annually?', ['₹12,000', '₹12,100', '₹11,900', '₹12,200'], 1, 'The amount is 10,000 × 1.1² = ₹12,100.'),
      Q('Three-fifths of a number is 42. What is the number?', ['63', '65', '70', '75'], 2, 'If 3/5 of the number is 42, the number is 42 × 5 ÷ 3 = 70.'),
      Q('A 180 m train travels at 54 km/h. How many seconds does it take to pass a pole?', ['10 s', '12 s', '15 s', '18 s'], 1, '54 km/h is 15 m/s. The train takes 180 ÷ 15 = 12 seconds to pass the pole.'),
      Q('How many different pairs can be selected from 12 people?', ['54', '60', '66', '72'], 2, 'The number of pairs is 12 × 11 ÷ 2 = 66.'),
      Q('What is 1/4 + 1/3?', ['5/7', '7/12', '2/7', '3/4'], 1, 'Using denominator 12, the sum is 3/12 + 4/12 = 7/12.'),
      Q('One pipe fills a tank in 6 hours and another in 3 hours. How long do they take together?', ['1 hour', '2 hours', '2.5 hours', '3 hours'], 1, 'Their rates add to 1/6 + 1/3 = 1/2 tank per hour, so a full tank takes 2 hours.'),
      Q('A product marked at ₹1,200 is sold at a 15% discount. What is its selling price?', ['₹1,000', '₹1,020', '₹1,050', '₹1,080'], 1, 'The discount is 0.15 × 1,200 = ₹180, leaving a selling price of ₹1,020.'),
      Q('A value increases by 25% and then decreases by 20%. What is the net percentage change?', ['No change', '5% increase', '5% decrease', '10% increase'], 0, 'Multiplying by 1.25 and then 0.80 gives 1.00, so the original value is restored.'),
      Q('Two fair dice are rolled. What is the probability that their sum is 7?', ['1/12', '1/6', '1/4', '7/36'], 1, 'Six of the 36 equally likely outcomes sum to 7, giving 6/36 = 1/6.')
    ]
  },
  {
    key: 'placement-preparation-logical-reasoning', title: 'Logical Reasoning', category: 'placement-preparation', topic: 'Logical Reasoning', difficulty: 'medium', duration: 20,
    description: 'Test number and letter patterns, deductions, directions, and practical logic.',
    questions: [
      Q('What number comes next: 3, 7, 15, 31, ...?', ['47', '55', '63', '65'], 2, 'Each term is twice the previous term plus one: 31 × 2 + 1 = 63.'),
      Q('What number comes next: 2, 6, 12, 20, 30, ...?', ['36', '40', '42', '44'], 2, 'The terms are n(n + 1) for n = 1, 2, 3, and so on. The next is 6 × 7 = 42.'),
      Q('All robins are birds. Some birds migrate. Which statement must be true?', ['All robins migrate', 'Some robins migrate', 'Every robin is a bird', 'No robins migrate'], 2, 'The first premise directly establishes that every robin belongs to the group of birds. It does not say whether robins migrate.'),
      Q('A is scheduled before B, and C is scheduled after B. Which task is first?', ['A', 'B', 'C', 'The order cannot be known'], 0, 'The constraints give A before B before C, so A is first.'),
      Q('If each letter is replaced by the next letter in the alphabet, how is DOG encoded?', ['EPH', 'CNG', 'EOG', 'FQI'], 0, 'D becomes E, O becomes P, and G becomes H, producing EPH.'),
      Q('A person walks 10 km north and then 6 km east. What is the straight-line distance from the starting point?', ['4 km', '2√34 km', '12 km', '16 km'], 1, 'The path forms a right triangle, so the distance is √(10² + 6²) = √136 = 2√34 km.'),
      Q('Which item does not belong with the others: cube, sphere, cylinder, triangle?', ['Cube', 'Sphere', 'Cylinder', 'Triangle'], 3, 'A triangle is a two-dimensional shape; the other three are three-dimensional solids.'),
      Q('X is taller than Y, and Y is taller than Z. Who is the tallest?', ['X', 'Y', 'Z', 'Cannot be determined'], 0, 'The two comparisons establish X > Y > Z in height.'),
      Q('If 5 machines make 5 components in 5 minutes at the same rate, how long do 100 machines take to make 100 components?', ['5 minutes', '20 minutes', '100 minutes', '500 minutes'], 0, 'Each machine makes one component in 5 minutes, so 100 machines make 100 components in 5 minutes.'),
      Q('If today is Monday, what day will it be 45 days from today?', ['Tuesday', 'Wednesday', 'Thursday', 'Friday'], 2, 'Forty-five days is six weeks plus three days. Three days after Monday is Thursday.'),
      Q('What number comes next: 1, 4, 9, 16, 25, ...?', ['30', '32', '35', '36'], 3, 'These are consecutive squares: 1², 2², 3², 4², 5²; the next is 6² = 36.'),
      Q('What letter comes next: B, E, I, N, T, ...?', ['A', 'Z', 'Y', 'B'], 0, 'The forward steps increase by one: +3, +4, +5, +6, then +7. Wrapping after Z gives A.'),
      Q('Some engineers are musicians. All musicians are creative. Which conclusion follows?', ['Some engineers are creative', 'All engineers are creative', 'No engineers are creative', 'All creative people are engineers'], 0, 'The engineers who are musicians belong to the creative group, so some engineers are creative.'),
      Q('If P implies Q and P is true, what follows?', ['Q is true', 'Q is false', 'P and Q are both false', 'Nothing can be concluded'], 0, 'Modus ponens says that P → Q together with P establishes Q.'),
      Q('How many handshakes occur if each of 8 people shakes hands once with every other person?', ['16', '24', '28', '56'], 2, 'Each handshake is one pair, so the total is 8 × 7 ÷ 2 = 28.')
    ]
  },
  {
    key: 'placement-preparation-verbal-ability', title: 'Verbal Ability', category: 'placement-preparation', topic: 'Verbal Ability', difficulty: 'medium', duration: 20,
    description: 'Practice grammar, vocabulary, sentence structure, and concise comprehension.',
    questions: [
      Q('Choose the grammatically correct sentence.', ['Each of the applicants have submitted a résumé.', 'Each of the applicants has submitted a résumé.', 'Each applicants has submitted a résumé.', 'Each of applicants have submitted a résumé.'], 1, 'The subject “each” is singular, so it takes the singular verb “has.”'),
      Q('Choose the closest meaning of “concise.”', ['Brief and clear', 'Uncertain and hesitant', 'Decorative and elaborate', 'Angry and forceful'], 0, 'Concise writing expresses an idea clearly with few unnecessary words.'),
      Q('Choose the antonym of “reluctant.”', ['Unwilling', 'Cautious', 'Eager', 'Doubtful'], 2, 'Reluctant means unwilling or hesitant; eager expresses willingness and enthusiasm.'),
      Q('Complete the sentence: “Neither the manager nor the assistants ___ available.”', ['is', 'was', 'are', 'has'], 2, 'With “neither … nor,” the verb agrees with the nearer subject, “assistants,” which is plural.'),
      Q('Choose the correct word: “The new policy will ___ every department.”', ['effect', 'affect', 'effects', 'affecting'], 1, '“Affect” is the verb meaning to influence; “effect” is commonly a noun meaning result.'),
      Q('Choose the correctly punctuated sentence.', ['After the meeting we reviewed the plan, assigned owners, and set deadlines.', 'After the meeting, we reviewed the plan, assigned owners, and set deadlines.', 'After the meeting we reviewed, the plan assigned owners and set deadlines.', 'After, the meeting we reviewed the plan assigned owners, and set deadlines.'], 1, 'A comma after the introductory phrase separates it from the main clause; commas also separate items in the series.'),
      Q('Choose the best completion: “Despite the short deadline, the team delivered the report ___.”', ['on time', 'in time enough', 'at the time of', 'by timely'], 0, '“On time” means by the agreed or scheduled deadline.'),
      Q('What does the phrase “keep an eye on” mean?', ['Watch or monitor', 'Ignore completely', 'Make a copy of', 'Finish immediately'], 0, 'To keep an eye on something is to watch or monitor it.'),
      Q('Choose the correctly spelled word.', ['Accomodation', 'Acommodation', 'Accommodation', 'Accommadation'], 2, 'The standard spelling is “accommodation,” with two c’s and two m’s.'),
      Q('Complete the analogy: “Blueprint is to building as outline is to ___.”', ['Essay', 'Brick', 'Editor', 'Library'], 0, 'A blueprint plans a building; an outline organizes an essay before it is written.'),
      Q('Choose the sentence with correct parallel structure.', ['She enjoys reading, to swim, and cycling.', 'She enjoys reading, swimming, and cycling.', 'She enjoys to read, swimming, and to cycle.', 'She enjoys read, swim, and cycling.'], 1, 'All three activities use the same -ing form, making the list parallel.'),
      Q('What is the best meaning of “mitigate” in “The backup plan mitigated the delay”?', ['Made less severe', 'Made impossible to notice', 'Caused deliberately', 'Measured precisely'], 0, 'To mitigate a problem is to reduce its severity or impact.'),
      Q('Choose the correct completion: “The results were different ___ the initial estimate.”', ['than', 'from', 'then', 'to'], 1, 'In standard usage, something is “different from” another thing.'),
      Q('Which sentence is in the passive voice?', ['The analyst reviewed the figures.', 'The figures were reviewed by the analyst.', 'The analyst is reviewing the figures.', 'The analyst will review the figures.'], 1, 'The subject “figures” receives the action in “were reviewed,” forming the passive voice.'),
      Q('Read: “The pilot reduced loading time, but the team will collect data from more users before adopting it.” What is the team’s next step?', ['Collect more user data', 'End all performance testing', 'Adopt the pilot immediately', 'Restore the previous version'], 0, 'The sentence explicitly says the team will gather more user data before deciding whether to adopt the pilot.')
    ]
  },
  {
    key: 'placement-preparation-analytical-reasoning', title: 'Analytical Reasoning', category: 'placement-preparation', topic: 'Analytical Reasoning', difficulty: 'medium', duration: 15,
    description: 'Solve placement-style ordering, grouping, and data interpretation problems.',
    questions: [
      Q('Four interviews P, Q, R, and S are scheduled one per day from Monday to Thursday. P is before Q, and R is after Q. Which order is possible?', ['P, Q, R, S', 'Q, P, S, R', 'R, P, Q, S', 'S, R, Q, P'], 0, 'P is before Q and R is after Q in the order P, Q, R, S, so all constraints are satisfied.'),
      Q('A team has 12 members. Five know Java, 7 know SQL, and 3 know both. How many know at least one of the two?', ['8', '9', '12', '15'], 1, 'By inclusion-exclusion, 5 + 7 − 3 = 9 members know at least one of the two subjects.'),
      Q('A report lists 40 applications on Monday and 50 on Tuesday. By what percentage did applications increase?', ['10%', '20%', '25%', '50%'], 2, 'The increase is 10 on a base of 40, so 10 ÷ 40 × 100 = 25%.'),
      Q('A, B, C, and D sit in a row. A is immediately left of B, and D is at the far right. Which arrangement is possible?', ['A, B, C, D', 'B, A, C, D', 'C, A, D, B', 'D, A, B, C'], 0, 'A is immediately before B and D is at the far right only in A, B, C, D.'),
      Q('A project requires tasks M and N before O. Task P must follow O. Which task must be last among these four?', ['M', 'N', 'O', 'P'], 3, 'P must follow O, and O follows both M and N, so P is last.'),
      Q('A survey of 80 candidates finds 48 use a coding platform and 32 use a mock-test platform. If 20 use both, how many use neither?', ['12', '20', '28', '40'], 1, 'At least one platform is used by 48 + 32 − 20 = 60 candidates. Thus 80 − 60 = 20 use neither.'),
      Q('A product’s monthly sales were 120, 150, and 180 units over three months. What was the average monthly sales volume?', ['140', '145', '150', '160'], 2, 'The total is 120 + 150 + 180 = 450; dividing by three gives 150.'),
      Q('Five candidates are ranked. K is above L, M is below L, and N is above K. Which order from highest to lowest is forced among N, K, L, and M?', ['N, K, L, M', 'K, N, M, L', 'M, L, K, N', 'N, L, M, K'], 0, 'The constraints establish N above K above L above M.'),
      Q('A box contains 3 red, 2 blue, and 5 green tokens. What fraction of the tokens are not green?', ['1/5', '1/2', '3/5', '4/5'], 1, 'There are 5 non-green tokens out of 10 total, giving 5/10 = 1/2.'),
      Q('A schedule assigns one distinct room to each of three sessions. Session X cannot use Room 1; Session Y must use Room 1. Which room assignment is valid?', ['X: 2, Y: 1, Z: 3', 'X: 1, Y: 2, Z: 3', 'X: 3, Y: 2, Z: 1', 'X: 2, Y: 3, Z: 1'], 0, 'In the first assignment, Y uses Room 1 and X avoids it; all sessions have distinct rooms.')
    ]
  },
  {
    key: 'placement-preparation-programming-fundamentals', title: 'Programming Fundamentals', category: 'placement-preparation', topic: 'Programming Fundamentals', difficulty: 'medium', duration: 20,
    description: 'Review language-independent programming concepts, data types, control flow, and complexity.',
    questions: [
      Q('What is the value of 17 divided by 5 using integer division?', ['2', '3', '3.4', '4'], 1, 'Integer division discards the fractional part, leaving quotient 3.'),
      Q('Which control structure is most suitable when a block should repeat while a condition remains true?', ['Conditional branch', 'Loop', 'Variable declaration', 'Return statement'], 1, 'A loop repeats its body while its continuation condition is satisfied.'),
      Q('In many programming languages, what is the result of 2 + 3 × 4 under standard operator precedence?', ['20', '14', '24', '9'], 1, 'Multiplication is evaluated before addition, so 2 + 12 = 14.'),
      Q('What does a function parameter represent?', ['A named input accepted by the function', 'A value printed automatically', 'A database row', 'A loop condition only'], 0, 'Parameters name the inputs that callers can pass to a function.'),
      Q('Which data structure follows last-in, first-out order?', ['Queue', 'Stack', 'Set', 'Graph'], 1, 'A stack removes the most recently inserted item first.'),
      Q('What is the main purpose of a Boolean value?', ['Represent true or false', 'Store any-length text', 'Measure elapsed time only', 'Represent a collection'], 0, 'Boolean values represent the two logical states true and false.'),
      Q('What is the typical index of the first element in a zero-indexed array?', ['-1', '0', '1', 'The array length'], 1, 'Zero-indexed arrays begin at index 0.'),
      Q('What does a base case do in a recursive function?', ['Stops recursion for a defined input', 'Starts an infinite loop', 'Sorts each function parameter', 'Allocates a database connection'], 0, 'A reachable base case returns without making another recursive call and terminates that chain.'),
      Q('Which expression checks whether x is between 1 and 5 inclusive in a language with short-circuit Boolean operators?', ['x >= 1 && x <= 5', 'x < 1 || x > 5', 'x == 1 && x == 5', 'x >= 5 && x <= 1'], 0, 'Both inclusive bounds must hold, so the comparisons are joined with AND.'),
      Q('What does a variable’s scope determine?', ['Where the variable can be accessed', 'How quickly the CPU executes it', 'How many files a program creates', 'Whether the network is encrypted'], 0, 'Scope defines the region of a program in which a name is visible.'),
      Q('What is the time complexity of reading an array element by a valid index?', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], 0, 'Array indexing computes the element address directly, so access is constant time.'),
      Q('Which statement about a pure function is generally correct?', ['Its result depends only on its inputs and it has no observable side effects', 'It must modify a global variable', 'It always returns a random value', 'It cannot accept parameters'], 0, 'A pure function has no observable side effects and returns the same result for the same inputs.'),
      Q('Why should a program validate external input?', ['To reject or handle values that violate expected constraints', 'To guarantee the input is always malicious', 'To avoid using data types', 'To make every input valid automatically'], 0, 'Validation checks that external values meet expected format and range before they are used.'),
      Q('What does a compiler error usually indicate?', ['The source violates a rule the compiler checks', 'The program has already produced correct output', 'The computer has no storage', 'A network request succeeded'], 0, 'A compiler reports source issues such as invalid syntax or incompatible types before execution.'),
      Q('What is the purpose of a unit test?', ['Check a focused piece of behavior against expected results', 'Replace all integration testing', 'Increase the program input size', 'Hide runtime errors'], 0, 'A unit test verifies a small unit of behavior with controlled inputs and expected outcomes.')
    ]
  },
  {
    key: 'placement-preparation-coding-mcq-test', title: 'Coding MCQ Test', category: 'placement-preparation', topic: 'Coding MCQ Test', difficulty: 'medium', duration: 25,
    description: 'Practice tracing short code snippets and identifying common algorithmic behavior.',
    questions: [
      Q('What does this pseudocode print? total = 0; for i = 1 to 4: total = total + i; print total', ['6', '8', '10', '12'], 2, 'The loop adds 1 + 2 + 3 + 4, which equals 10.'),
      Q('For values [4, 1, 3], a pass of bubble sort compares adjacent values and swaps out-of-order pairs from left to right. What is the array after one pass?', ['[1, 3, 4]', '[1, 4, 3]', '[3, 1, 4]', '[4, 3, 1]'], 0, 'The first comparison swaps 4 and 1, giving [1, 4, 3]; the next swaps 4 and 3, giving [1, 3, 4].'),
      Q('A loop runs once for each of n array elements and performs constant work per element. What is its time complexity?', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], 2, 'The constant work is repeated n times, so the total work grows linearly.'),
      Q('What does binary search require for its usual O(log n) behavior?', ['A sorted search range', 'A linked list with no order', 'A hash collision', 'A graph with no edges'], 0, 'Binary search discards half the remaining range based on ordering, so the data must be sorted.'),
      Q('In a zero-indexed array [8, 5, 9, 2], what value is at index 2?', ['5', '8', '9', '2'], 2, 'Index 0 contains 8, index 1 contains 5, and index 2 contains 9.'),
      Q('What is returned by a function that returns n % 2 for n = 11?', ['0', '1', '2', '5'], 1, 'The remainder after dividing 11 by 2 is 1.'),
      Q('A stack starts empty. Operations are push(4), push(7), pop(), push(2). What is on top?', ['4', '7', '2', 'The stack is empty'], 2, 'After removing 7, pushing 2 makes 2 the top element above 4.'),
      Q('A queue starts empty. Operations are enqueue(A), enqueue(B), dequeue(), enqueue(C). What is at the front?', ['A', 'B', 'C', 'The queue is empty'], 1, 'Dequeuing removes A; B remains at the front when C is added at the rear.'),
      Q('What does the following condition detect? if (n > 0 && n % 2 == 0)', ['A positive even number', 'Any even number including negatives', 'A positive odd number', 'Zero or a positive number'], 0, 'Both conditions must hold: n is positive and its remainder modulo 2 is zero.'),
      Q('An algorithm checks every pair of distinct elements in an array using nested loops. What is its typical time complexity?', ['O(log n)', 'O(n)', 'O(n log n)', 'O(n²)'], 3, 'The nested iteration considers a number of pairs proportional to n².'),
      Q('What is the output of x = 3; x = x * 2 + 1; print x?', ['6', '7', '8', '9'], 1, 'The update computes 3 × 2 + 1 = 7.'),
      Q('Which change prevents a loop `while (i < n)` from running forever when i starts at 0?', ['Increment i during each iteration', 'Set n to a larger value each time', 'Remove the loop body', 'Reset i to 0 at the end of each iteration'], 0, 'Incrementing i moves it toward the terminating condition i >= n.'),
      Q('A function returns the maximum of two values a and b. Which comparison selects b when the values are equal?', ['a > b ? a : b', 'a < b ? a : b', 'a == b ? a : b', 'a != b ? b : a'], 0, 'When a and b are equal, a > b is false, so the conditional expression returns b.'),
      Q('What is the space complexity of an iterative algorithm that uses a fixed number of extra variables regardless of input size?', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], 0, 'A fixed amount of additional storage is constant auxiliary space.'),
      Q('In a singly linked list, what does the next reference of the last node normally contain?', ['The first node', 'A null reference', 'The list length', 'The previous node'], 1, 'In a non-circular singly linked list, the last node marks the end with a null next reference.')
    ]
  },
  {
    key: 'placement-preparation-full-mock-test', title: 'Full Placement Mock Test', category: 'placement-preparation', topic: 'Full Placement Mock Test', difficulty: 'full_mock', duration: 45,
    description: 'A mixed 30-question placement-level assessment covering aptitude, reasoning, verbal ability, and technical fundamentals.',
    questions: [
      Q('A value of 800 is increased by 15%. What is the new value?', ['880', '900', '920', '940'], 2, 'Fifteen percent of 800 is 120, so the new value is 800 + 120 = 920.'),
      Q('A can complete a task in 10 days and B in 15 days. How much of the task do they complete together in one day?', ['1/25', '1/6', '1/5', '1/3'], 1, 'Their combined rate is 1/10 + 1/15 = 3/30 + 2/30 = 1/6 of the task per day.'),
      Q('What number comes next: 5, 10, 20, 40, ...?', ['60', '70', '80', '100'], 2, 'Each term doubles, so the next term is 40 × 2 = 80.'),
      Q('Choose the correctly written sentence.', ['The list of candidates are ready.', 'The list of candidates is ready.', 'The list of candidate are ready.', 'The lists of candidate is ready.'], 1, 'The subject is singular “list,” so the singular verb “is” agrees with it.'),
      Q('What is the average of 12, 18, and 24?', ['16', '18', '20', '22'], 1, 'The sum is 54; dividing by three gives an average of 18.'),
      Q('A code uses `if (score >= 40)` to mark a pass. What happens when score is exactly 40?', ['It is marked as a pass', 'It is marked as a fail', 'The condition is undefined', 'The score is changed to 41'], 0, 'The greater-than-or-equal comparison includes 40.'),
      Q('All analysts use spreadsheets. Mira is an analyst. What follows?', ['Mira uses spreadsheets', 'All spreadsheet users are analysts', 'Mira manages a team', 'No analysts use spreadsheets'], 0, 'Mira belongs to the analyst group, and every analyst is stated to use spreadsheets.'),
      Q('A 240 km trip takes 4 hours. What is the average speed?', ['50 km/h', '55 km/h', '60 km/h', '65 km/h'], 2, 'Average speed is 240 ÷ 4 = 60 km/h.'),
      Q('Choose the closest meaning of “reliable.”', ['Dependable', 'Temporary', 'Unusual', 'Distant'], 0, 'Reliable means able to be trusted or depended upon.'),
      Q('What does a queue remove first?', ['The most recently added item', 'The earliest added item', 'The largest item', 'A random item'], 1, 'A queue follows first-in, first-out order.'),
      Q('What is 30% of 250?', ['65', '70', '75', '80'], 2, 'Thirty percent of 250 is 0.30 × 250 = 75.'),
      Q('If today is Wednesday, what day is it 10 days later?', ['Friday', 'Saturday', 'Sunday', 'Monday'], 1, 'Ten days is one week plus three days; three days after Wednesday is Saturday.'),
      Q('Which SQL clause filters individual rows before grouping?', ['HAVING', 'WHERE', 'ORDER BY', 'GROUP BY'], 1, 'WHERE filters rows before any grouping or aggregation occurs.'),
      Q('A bag has 4 white and 6 black counters. What is the probability of drawing a white counter?', ['1/5', '2/5', '3/5', '4/5'], 1, 'There are 4 favorable outcomes among 10 counters, giving 4/10 = 2/5.'),
      Q('A is older than B, and B is older than C. Who is youngest?', ['A', 'B', 'C', 'Cannot be determined'], 2, 'The order is A older than B older than C, making C the youngest.'),
      Q('What is the value of 5 + 2 × 6 under standard precedence?', ['42', '17', '30', '72'], 1, 'Multiplication is performed first: 5 + 12 = 17.'),
      Q('Choose the antonym of “expand.”', ['Enlarge', 'Extend', 'Contract', 'Increase'], 2, 'Contract means to become smaller, the opposite of expand.'),
      Q('How many different ways can 4 distinct books be arranged in a row?', ['12', '16', '20', '24'], 3, 'There are 4! arrangements, which equals 4 × 3 × 2 × 1 = 24.'),
      Q('What is the purpose of a function return statement?', ['Send a result back to the caller', 'Repeat the function forever', 'Declare a new file', 'Sort all global variables'], 0, 'A return statement supplies a result to the code that called the function.'),
      Q('A train covers 90 km in 1.5 hours. What is its average speed?', ['45 km/h', '50 km/h', '60 km/h', '75 km/h'], 2, 'Average speed is 90 ÷ 1.5 = 60 km/h.'),
      Q('What number comes next: 4, 9, 16, 25, ...?', ['30', '32', '36', '49'], 2, 'The terms are squares 2², 3², 4², and 5²; the next is 6² = 36.'),
      Q('Which data structure is best suited to process items in arrival order?', ['Stack', 'Queue', 'Tree', 'Set'], 1, 'A queue preserves arrival order through first-in, first-out processing.'),
      Q('Choose the correct completion: “The candidates ___ waiting outside.”', ['is', 'was', 'are', 'has'], 2, '“Candidates” is plural, so it takes the plural verb “are.”'),
      Q('A product costing ₹500 is discounted by 10%. What is the sale price?', ['₹400', '₹450', '₹475', '₹490'], 1, 'Ten percent of ₹500 is ₹50; the sale price is ₹500 − ₹50 = ₹450.'),
      Q('If every report is reviewed and this document is a report, what follows?', ['This document is reviewed', 'Every reviewed item is a report', 'This document is approved', 'No reports are reviewed'], 0, 'The document belongs to the set of reports, all of which are reviewed.'),
      Q('What is the time complexity of scanning an unsorted array once to find a value?', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], 2, 'In the worst case, each of n elements must be checked once.'),
      Q('What is the median of 3, 5, 8, 10, and 14?', ['5', '8', '9', '10'], 1, 'The values are already ordered, and the middle of five values is 8.'),
      Q('A team completes 3/8 of a project in one week. At the same rate, what fraction remains after two weeks?', ['1/8', '1/4', '3/8', '5/8'], 1, 'Two weeks complete 6/8 of the project, leaving 2/8 = 1/4.'),
      Q('Which HTTP method is conventionally used to retrieve a resource without changing it?', ['GET', 'POST', 'PATCH', 'DELETE'], 0, 'GET is conventionally used to retrieve a resource; it should not change server state.'),
      Q('A password must contain at least 8 characters. Which length is valid?', ['6', '7', '8', '5'], 2, 'The requirement is at least 8 characters, so a length of exactly 8 is valid.')
    ]
  }
];

function validateSeedData() {
  const supportedTypes = new Set(['multiple_choice', 'true_false', 'code_output']);
  const categorySlugs = new Set(categories.map(category => category.slug));
  const quizKeys = new Set();
  const expectedQuestionCounts = new Map([
    ['sample-placement-mock', 20],
    ['placement-full-mock-01', 40],
    ['placement-preparation-quantitative-aptitude', 15],
    ['placement-preparation-logical-reasoning', 15],
    ['placement-preparation-verbal-ability', 15],
    ['placement-preparation-analytical-reasoning', 10],
    ['placement-preparation-programming-fundamentals', 15],
    ['placement-preparation-coding-mcq-test', 15],
    ['placement-preparation-full-mock-test', 30]
  ]);

  if (
    categories.length !== 18 ||
    categories.reduce((total, category) => total + category.topics.length, 0) !== 99 ||
    quizzes.length !== 32
  ) {
    throw new Error('Sample categories, topics, or quiz count do not match the seed specification.');
  }

  for (const quiz of quizzes) {
    const category = categories.find(item => item.slug === quiz.category);
    const expectedCount = expectedQuestionCounts.get(quiz.key) || 10;

    if (
      !categorySlugs.has(quiz.category) ||
      !category?.topics.includes(quiz.topic) ||
      quizKeys.has(quiz.key) ||
      !quiz.difficulty ||
      quiz.questions.length !== expectedCount
    ) {
      throw new Error(`Invalid sample quiz metadata or question count: ${quiz.key}`);
    }
    quizKeys.add(quiz.key);

    for (const question of quiz.questions) {
      if (
        !question.text ||
        !question.explanation ||
        !supportedTypes.has(question.type) ||
        question.options.length < 2 ||
        question.options.length > 8 ||
        (quiz.category === 'placement-preparation' && question.options.length !== 4) ||
        new Set(question.options.map(option => option.toLowerCase())).size !== question.options.length ||
        !Number.isInteger(question.correct) ||
        question.correct < 0 ||
        question.correct >= question.options.length
      ) {
        throw new Error(`Invalid sample question in ${quiz.key}.`);
      }
    }
  }
}

async function upsertCategories() {
  const categoryIds = new Map();
  const topicIds = new Map();

  for (const category of categories) {
    const [existing] = await pool.execute(
      'SELECT category_id FROM categories WHERE slug = ?',
      [category.slug]
    );
    let categoryId;

    if (existing[0]) {
      categoryId = existing[0].category_id;
      await pool.execute(
        'UPDATE categories SET name = ?, description = ?, icon = ?, sort_order = ? WHERE category_id = ?',
        [category.name, category.description, category.icon, category.sortOrder, categoryId]
      );
    } else {
      const [result] = await pool.execute(
        'INSERT INTO categories (name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
        [category.name, category.slug, category.description, category.icon, category.sortOrder]
      );
      categoryId = result.insertId;
    }

    categoryIds.set(category.slug, categoryId);

    for (const topicName of category.topics) {
      await pool.execute(
        'INSERT IGNORE INTO topics (category_id, name) VALUES (?, ?)',
        [categoryId, topicName]
      );
      const [[topic]] = await pool.execute(
        'SELECT topic_id FROM topics WHERE category_id = ? AND name = ?',
        [categoryId, topicName]
      );
      topicIds.set(`${category.slug}:${topicName}`, topic.topic_id);
    }
  }

  return { categoryIds, topicIds };
}

async function getPlacementPreparationIds(placementQuizzes) {
  const [[category]] = await pool.execute(
    'SELECT category_id FROM categories WHERE slug = ?',
    ['placement-preparation']
  );
  if (!category) {
    throw new Error('Placement Preparation category does not exist. Run the taxonomy seed first.');
  }

  const categoryIds = new Map([['placement-preparation', category.category_id]]);
  const topicIds = new Map();
  for (const quiz of placementQuizzes) {
    const [[topic]] = await pool.execute(
      'SELECT topic_id FROM topics WHERE category_id = ? AND name = ?',
      [category.category_id, quiz.topic]
    );
    if (!topic) {
      throw new Error(`Placement Preparation topic is missing: ${quiz.topic}`);
    }
    topicIds.set(`placement-preparation:${quiz.topic}`, topic.topic_id);
  }

  return { categoryIds, topicIds };
}

async function seedPlacementPreparationQuiz(quiz, categoryId, topicId, creatorId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[existingQuiz]] = await conn.execute(
      'SELECT quiz_id, category_id, topic_id FROM quizzes WHERE seed_key = ?',
      [quiz.key]
    );

    if (existingQuiz) {
      if (
        Number(existingQuiz.category_id) !== Number(categoryId) ||
        Number(existingQuiz.topic_id) !== Number(topicId)
      ) {
        throw new Error(`Existing seeded quiz has an unexpected category or topic: ${quiz.key}`);
      }

      const [[questionStats]] = await conn.execute(
        `SELECT COUNT(*) AS question_count,
          SUM(CASE WHEN COALESCE(option_stats.option_count, 0) <> 4 THEN 1 ELSE 0 END) AS invalid_option_count,
          SUM(CASE WHEN COALESCE(option_stats.correct_count, 0) <> 1 THEN 1 ELSE 0 END) AS invalid_correct_count
         FROM questions q
         LEFT JOIN (
           SELECT question_id, COUNT(*) AS option_count,
             SUM(is_correct = TRUE) AS correct_count
           FROM options
           GROUP BY question_id
         ) option_stats ON option_stats.question_id = q.question_id
         WHERE q.quiz_id = ?`,
        [existingQuiz.quiz_id]
      );
      if (
        Number(questionStats.question_count) !== quiz.questions.length ||
        Number(questionStats.invalid_option_count || 0) !== 0 ||
        Number(questionStats.invalid_correct_count || 0) !== 0
      ) {
        throw new Error(`Existing seeded quiz is incomplete or invalid: ${quiz.key}`);
      }

      await conn.commit();
      return false;
    }

    const [quizResult] = await conn.execute(
      `INSERT INTO quizzes
        (title, description, duration_minutes, is_published, created_by,
         category_id, topic_id, difficulty, target_question_count, seed_key)
       VALUES (?, ?, ?, TRUE, ?, ?, ?, ?, ?, ?)`,
      [
        quiz.title,
        quiz.description,
        quiz.duration,
        creatorId,
        categoryId,
        topicId,
        quiz.difficulty,
        quiz.questions.length,
        quiz.key
      ]
    );

    for (let index = 0; index < quiz.questions.length; index++) {
      const question = quiz.questions[index];
      const seedKey = `${quiz.key}:q${String(index + 1).padStart(2, '0')}`;
      const [questionResult] = await conn.execute(
        `INSERT INTO questions
          (quiz_id, question_text, marks, display_order, question_type, explanation, seed_key)
         VALUES (?, ?, 1, ?, ?, ?, ?)`,
        [quizResult.insertId, question.text, index + 1, question.type, question.explanation, seedKey]
      );

      for (let optionIndex = 0; optionIndex < question.options.length; optionIndex++) {
        await conn.execute(
          'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
          [questionResult.insertId, question.options[optionIndex], optionIndex === question.correct]
        );
      }
    }

    await conn.commit();
    return true;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function seed() {
  validateSeedData();
  if (process.argv.includes('--validate-only')) {
    console.log(`Seed validated: ${categories.length} categories; ${categories.reduce((count, item) => count + item.topics.length, 0)} topics; ${quizzes.length} quizzes; ${quizzes.reduce((count, quiz) => count + quiz.questions.length, 0)} questions.`);
    return;
  }

  const placementPreparationOnly = process.argv.includes('--placement-preparation-quizzes-only');
  const placementMockOnly = process.argv.includes('--placement-mock-only');
  const companyInterviewOnly = process.argv.includes('--company-interview-only');
  const placementTopicsOnly = process.argv.includes('--placement-preparation-topics-only');
  if ([placementPreparationOnly, placementMockOnly, companyInterviewOnly, placementTopicsOnly]
    .filter(Boolean).length > 1) {
    throw new Error('Choose only one quiz- or topic-specific seed option.');
  }
  if (
    (placementPreparationOnly || placementMockOnly || companyInterviewOnly) &&
    process.argv.includes('--taxonomy-only')
  ) {
    throw new Error('Choose either a quiz-specific seed option or --taxonomy-only.');
  }

  if (placementTopicsOnly) {
    const category = categories.find(item => item.slug === 'placement-preparation');
    const [[row]] = await pool.execute(
      'SELECT category_id FROM categories WHERE slug = ?',
      [category.slug]
    );
    if (!row) {
      throw new Error('Placement Preparation category does not exist. Run the taxonomy seed first.');
    }

    let createdTopics = 0;
    for (const topicName of category.topics) {
      const [result] = await pool.execute(
        'INSERT IGNORE INTO topics (category_id, name) VALUES (?, ?)',
        [row.category_id, topicName]
      );
      createdTopics += result.affectedRows;
    }

    console.log(`Placement Preparation topics synchronized: ${category.topics.length}; added: ${createdTopics}.`);
    return;
  }

  const [admins] = await pool.query(
    "SELECT user_id FROM users WHERE role = 'admin' ORDER BY user_id LIMIT 1"
  );
  let creator = admins[0];

  if (!creator) {
    const [users] = await pool.query('SELECT user_id FROM users ORDER BY user_id LIMIT 1');
    creator = users[0];
  }

  if (!creator) {
    throw new Error('Register an account before seeding sample quizzes.');
  }

  const placementPreparationQuizzes = placementPreparationOnly
    ? quizzes.filter(quiz =>
        quiz.category === 'placement-preparation' &&
        quiz.key.startsWith('placement-preparation-')
      )
    : [];
  const { categoryIds, topicIds } = placementPreparationOnly
    ? await getPlacementPreparationIds(placementPreparationQuizzes)
    : await upsertCategories();
  if (process.argv.includes('--taxonomy-only')) {
    console.log(`Taxonomy updated only: ${categories.length} categories; ${categories.reduce((count, item) => count + item.topics.length, 0)} topics.`);
    return;
  }

  let createdQuizzes = 0;
  let updatedQuizzes = 0;
  let seededQuestions = 0;
  let skippedQuizzes = 0;
  const quizzesToSeed = placementPreparationOnly
    ? placementPreparationQuizzes
    : placementMockOnly
      ? quizzes.filter(quiz => quiz.key === 'placement-full-mock-01')
      : companyInterviewOnly
        ? quizzes.filter(quiz =>
          ['company-placement-preparation', 'interview-preparation'].includes(quiz.category)
          )
        : quizzes;

  if (placementPreparationOnly && quizzesToSeed.length !== 7) {
    throw new Error('The Placement Preparation quiz seed is missing or ambiguous.');
  }
  if (placementMockOnly && quizzesToSeed.length !== 1) {
    throw new Error('The placement mock seed is missing or ambiguous.');
  }
  if (companyInterviewOnly && quizzesToSeed.length !== 14) {
    throw new Error('The company and interview quiz seed is missing or ambiguous.');
  }

  if (placementPreparationOnly) {
    for (const quiz of quizzesToSeed) {
      const created = await seedPlacementPreparationQuiz(
        quiz,
        categoryIds.get(quiz.category),
        topicIds.get(`${quiz.category}:${quiz.topic}`),
        creator.user_id
      );
      if (created) {
        createdQuizzes += 1;
        seededQuestions += quiz.questions.length;
      } else {
        skippedQuizzes += 1;
      }
    }

    console.log(`Placement Preparation quizzes created: ${createdQuizzes}; already present and unchanged: ${skippedQuizzes}.`);
    console.log(`Placement Preparation questions inserted: ${seededQuestions}.`);
    return;
  }

  for (const quiz of quizzesToSeed) {
    const [[existingQuiz]] = await pool.execute(
      'SELECT quiz_id FROM quizzes WHERE seed_key = ?',
      [quiz.key]
    );
    let quizId;

    if (existingQuiz) {
      quizId = existingQuiz.quiz_id;
      const [[attemptCount]] = await pool.execute(
        'SELECT COUNT(*) AS count FROM attempts WHERE quiz_id = ?',
        [quizId]
      );

      if (Number(attemptCount.count) > 0) {
        await pool.execute(
          'UPDATE quizzes SET category_id = ?, topic_id = ? WHERE quiz_id = ?',
          [
            categoryIds.get(quiz.category),
            topicIds.get(`${quiz.category}:${quiz.topic}`),
            quizId
          ]
        );
        skippedQuizzes += 1;
        continue;
      }

      await pool.execute(
        `UPDATE quizzes SET title = ?, description = ?, duration_minutes = ?,
          is_published = TRUE, category_id = ?, topic_id = ?, difficulty = ?, target_question_count = ?
         WHERE quiz_id = ?`,
        [
          quiz.title,
          quiz.description,
          quiz.duration,
          categoryIds.get(quiz.category),
          topicIds.get(`${quiz.category}:${quiz.topic}`),
          quiz.difficulty,
          quiz.targetQuestionCount || quiz.questions.length,
          quizId
        ]
      );
      updatedQuizzes += 1;
    } else {
      const [result] = await pool.execute(
        `INSERT INTO quizzes
          (title, description, duration_minutes, is_published, created_by,
           category_id, topic_id, difficulty, target_question_count, seed_key)
         VALUES (?, ?, ?, TRUE, ?, ?, ?, ?, ?, ?)`,
        [
          quiz.title,
          quiz.description,
          quiz.duration,
          creator.user_id,
          categoryIds.get(quiz.category),
          topicIds.get(`${quiz.category}:${quiz.topic}`),
          quiz.difficulty,
          quiz.targetQuestionCount || quiz.questions.length,
          quiz.key
        ]
      );
      quizId = result.insertId;
      createdQuizzes += 1;
    }

    for (let index = 0; index < quiz.questions.length; index++) {
      const question = quiz.questions[index];
      const seedKey = `${quiz.key}:q${String(index + 1).padStart(2, '0')}`;
      const [[existingQuestion]] = await pool.execute(
        'SELECT question_id FROM questions WHERE seed_key = ?',
        [seedKey]
      );
      let questionId;

      if (existingQuestion) {
        questionId = existingQuestion.question_id;
        await pool.execute(
          `UPDATE questions SET question_text = ?, marks = 1, display_order = ?,
            question_type = ?, explanation = ? WHERE question_id = ?`,
          [question.text, index + 1, question.type, question.explanation, questionId]
        );
        await pool.execute('DELETE FROM options WHERE question_id = ?', [questionId]);
      } else {
        const [result] = await pool.execute(
          `INSERT INTO questions
            (quiz_id, question_text, marks, display_order, question_type, explanation, seed_key)
           VALUES (?, ?, 1, ?, ?, ?, ?)`,
          [quizId, question.text, index + 1, question.type, question.explanation, seedKey]
        );
        questionId = result.insertId;
      }

      for (let optionIndex = 0; optionIndex < question.options.length; optionIndex++) {
        await pool.execute(
          'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
          [questionId, question.options[optionIndex], optionIndex === question.correct]
        );
      }
      seededQuestions += 1;
    }
  }

  console.log(`Categories: ${categories.length}; topics: ${categories.reduce((count, item) => count + item.topics.length, 0)}.`);
  console.log(`Sample quizzes created: ${createdQuizzes}; updated: ${updatedQuizzes}; skipped with attempts: ${skippedQuizzes}.`);
  console.log(`Sample questions inserted or refreshed: ${seededQuestions}.`);
}

seed()
  .catch(error => {
    console.error('Sample seed failed:', error.code || error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
