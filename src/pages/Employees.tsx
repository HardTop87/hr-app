import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { UserProfile, Department } from '../types/user';
import { 
  Users, 
  Building2, 
  Mail, 
  Briefcase, 
  Search,
  Filter,
  Network
} from 'lucide-react';

type TabType = 'list' | 'orgchart';

export default function Employees() {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all employees from all companies (global_admin can see all)
      const usersRef = collection(db, 'users');
      let q = query(usersRef, where('status', '==', 'active'));
      
      const querySnapshot = await getDocs(q);
      const employeesList: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as UserProfile;
        employeesList.push({ ...data, uid: doc.id });
      });
      
      setEmployees(employeesList);

      // Load departments from all companies (subcollections)
      const allDepartments: Department[] = [];
      
      // Load Triple C departments
      console.log('Loading Triple C departments from subcollection...');
      const tripleCDeptsRef = collection(db, 'companies', 'triple_c', 'departments');
      const tripleCDeptsSnapshot = await getDocs(tripleCDeptsRef);
      tripleCDeptsSnapshot.forEach((doc) => {
        allDepartments.push({ id: doc.id, ...doc.data() } as Department);
      });
      console.log('Triple C departments loaded:', allDepartments.length);
      
      // Load Cococo departments
      console.log('Loading Cococo departments from subcollection...');
      const cococoDeptsRef = collection(db, 'companies', 'cococo', 'departments');
      const cococoDeptsSnapshot = await getDocs(cococoDeptsRef);
      cococoDeptsSnapshot.forEach((doc) => {
        allDepartments.push({ id: doc.id, ...doc.data() } as Department);
      });
      
      console.log('Total departments loaded:', allDepartments.length);
      console.log('All departments:', allDepartments);
      setDepartments(allDepartments);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentName = (deptId: string | null): string => {
    if (!deptId) return t('employeesPage.noDepartment');
    const dept = departments.find(d => d.id === deptId);
    return dept?.name || t('employeesPage.unknownDepartment');
  };

  const getCompanyName = (companyId: string): string => {
    if (companyId === 'triple_c') return 'Triple C';
    if (companyId === 'cococo') return 'Cococo';
    return companyId;
  };

  const getEmploymentTypeLabel = (type: string): string => {
    return t(`employeesPage.employmentTypes.${type}`);
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (emp.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || emp.departmentId === selectedDepartment;
    const matchesCompany = selectedCompany === 'all' || emp.companyId === selectedCompany;
    
    return matchesSearch && matchesDepartment && matchesCompany;
  });

  // Group employees by company
  const companiesWithEmployees = ['triple_c', 'cococo'].map(companyId => ({
    id: companyId,
    name: getCompanyName(companyId),
    employees: filteredEmployees.filter(e => e.companyId === companyId)
  })).filter(c => c.employees.length > 0);

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-center py-12">
          <div className="text-lg text-[--color-moss]">{t('loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-[#FF79C9]" />
          <h1 className="text-2xl sm:text-3xl font-bold text-[#4D2B41]">
            {t('employeesPage.title')}
          </h1>
        </div>
        <p className="text-[#1E4947] text-sm sm:text-base">
          {t('employeesPage.description')}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'list'
                ? 'bg-white text-[#FF79C9] shadow-sm'
                : 'text-[#4D2B41] hover:text-[#FF79C9]'
            }`}
          >
            <Users className="w-4 h-4" />
            {t('employeesPage.tabs.list')}
          </button>
          <button
            onClick={() => setActiveTab('orgchart')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'orgchart'
                ? 'bg-white text-[#FF79C9] shadow-sm'
                : 'text-[#4D2B41] hover:text-[#FF79C9]'
            }`}
          >
            <Network className="w-4 h-4" />
            {t('employeesPage.tabs.orgchart')}
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-[#1E4947]/10 p-4 mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('employeesPage.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[#1E4947]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF79C9] text-[#4D2B41]"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Company Filter */}
          {userProfile?.role === 'global_admin' && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#4D2B41] mb-1">
                <Building2 className="inline w-4 h-4 mr-1" />
                {t('employeesPage.filters.company')}
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-3 py-2 border border-[#1E4947]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF79C9] text-[#4D2B41]"
              >
                <option value="all">{t('employeesPage.filters.allCompanies')}</option>
                <option value="triple_c">Triple C</option>
                <option value="cococo">Cococo</option>
              </select>
            </div>
          )}

          {/* Department Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#4D2B41] mb-1">
              <Filter className="inline w-4 h-4 mr-1" />
              {t('employeesPage.filters.department')}
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-[#1E4947]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF79C9] text-[#4D2B41]"
            >
              <option value="all">{t('employeesPage.filters.allDepartments')}</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Employee Count */}
      <div className="mb-4 text-sm text-[#1E4947]">
        {t('employeesPage.showing', { count: filteredEmployees.length })}
      </div>

      {/* Employees grouped by Company */}
      <div className="space-y-8">
        {companiesWithEmployees.map(company => (
          <div key={company.id}>
            {/* Company Header */}
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-6 h-6 text-[#FF79C9]" />
              <h2 className="text-xl font-semibold text-[#4D2B41]">{company.name}</h2>
              <span className="text-sm text-[#1E4947] bg-[#FFEFF8] px-3 py-1 rounded-full">
                {company.employees.length} {t('employeesPage.employees')}
              </span>
            </div>

            {/* Employee Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {company.employees.map(employee => (
                <div
                  key={employee.uid}
                  className="bg-white rounded-lg shadow-sm border border-[#1E4947]/10 p-5 hover:shadow-md transition-shadow"
                >
                  {/* Profile Picture & Name */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF79C9] to-[#ff5eb8] flex items-center justify-center text-white font-semibold text-lg shrink-0">
                      {employee.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#4D2B41] text-lg truncate">
                        {employee.displayName}
                      </h3>
                      {employee.jobTitle && (
                        <p className="text-sm text-[#1E4947] truncate flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5" />
                          {employee.jobTitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="space-y-2.5 text-sm">
                    {/* Email */}
                    <div className="flex items-center gap-2 text-[#1E4947]">
                      <Mail className="w-4 h-4 text-[#FF79C9] shrink-0" />
                      <a 
                        href={`mailto:${employee.email}`}
                        className="hover:text-[#FF79C9] transition-colors truncate"
                      >
                        {employee.email}
                      </a>
                    </div>

                    {/* Department */}
                    <div className="flex items-center gap-2 text-[#1E4947]">
                      <Building2 className="w-4 h-4 text-[#FF79C9] shrink-0" />
                      <span className="truncate">{getDepartmentName(employee.departmentId)}</span>
                    </div>

                    {/* Employment Type */}
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-[#FFEFF8] text-[#4D2B41] rounded-md text-xs font-medium">
                        {getEmploymentTypeLabel(employee.employmentType)}
                      </span>
                    </div>

                    {/* Employee ID (optional) */}
                    {employee.employeeId && (
                      <div className="text-xs text-[#1E4947]/70 pt-2 border-t border-[#1E4947]/10">
                        {t('employeesPage.employeeId')}: {employee.employeeId}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-[#1E4947]/10">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-[#1E4947] text-lg font-medium mb-2">
              {t('employeesPage.noResults')}
            </p>
            <p className="text-sm text-[#1E4947]/70">
              {t('employeesPage.noResultsHint')}
            </p>
          </div>
        )}
      </div>
        </>
      ) : (
        <OrgChart 
          employees={filteredEmployees}
          getDepartmentName={getDepartmentName}
          getCompanyName={getCompanyName}
        />
      )}
    </div>
  );
}

// Org Chart Component
interface OrgChartProps {
  employees: UserProfile[];
  getDepartmentName: (deptId: string | null) => string;
  getCompanyName: (companyId: string) => string;
}

function OrgChart({ employees, getDepartmentName, getCompanyName }: OrgChartProps) {
  const { t } = useTranslation();

  // Build hierarchy tree
  const buildHierarchy = (employees: UserProfile[]) => {
    // Find root employees (no manager)
    const rootEmployees = employees.filter(emp => !emp.reportsTo);
    
    // Recursive function to build tree
    const buildNode = (employee: UserProfile): EmployeeNode => {
      const subordinates = employees
        .filter(emp => emp.reportsTo === employee.uid)
        .map(emp => buildNode(emp));
      
      return {
        employee,
        subordinates: subordinates.length > 0 ? subordinates : undefined
      };
    };

    return rootEmployees.map(emp => buildNode(emp));
  };

  interface EmployeeNode {
    employee: UserProfile;
    subordinates?: EmployeeNode[];
  }

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (uid: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(uid)) {
      newExpanded.delete(uid);
    } else {
      newExpanded.add(uid);
    }
    setExpandedNodes(newExpanded);
  };

  // Render employee node
  const renderNode = (node: EmployeeNode, level: number = 0) => {
    const hasSubordinates = node.subordinates && node.subordinates.length > 0;
    const isExpanded = expandedNodes.has(node.employee.uid);
    
    return (
      <div key={node.employee.uid} className="relative">
        {/* Employee Card */}
        <div 
          className={`bg-white rounded-lg shadow-sm border border-[#1E4947]/10 p-4 hover:shadow-md transition-all ${
            level > 0 ? 'ml-8 mt-4' : 'mb-6'
          }`}
          style={{ marginLeft: level > 0 ? `${level * 2}rem` : 0 }}
        >
          <div className="flex items-center gap-4">
            {/* Photo */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF79C9] to-[#ff5eb8] flex items-center justify-center text-white font-semibold text-lg shrink-0">
              {node.employee.displayName.charAt(0).toUpperCase()}
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-[#4D2B41] text-base truncate">
                  {node.employee.displayName}
                </h3>
                <span className="text-xs px-2 py-0.5 bg-[#FFEFF8] text-[#4D2B41] rounded">
                  {getCompanyName(node.employee.companyId)}
                </span>
              </div>
              
              {node.employee.jobTitle && (
                <p className="text-sm text-[#1E4947] truncate flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  {node.employee.jobTitle}
                </p>
              )}
              
              <div className="flex items-center gap-3 mt-1 text-xs text-[#1E4947]/70">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {getDepartmentName(node.employee.departmentId)}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {node.employee.email}
                </span>
              </div>
            </div>
            
            {/* Expand/Collapse Button */}
            {hasSubordinates && (
              <button
                onClick={() => toggleNode(node.employee.uid)}
                className="px-3 py-1 text-xs font-medium text-[#FF79C9] hover:bg-[#FFEFF8] rounded-md transition-colors"
              >
                {isExpanded ? t('employeesPage.orgchart.collapse') : t('employeesPage.orgchart.expand')}
                {!isExpanded && ` (${node.subordinates!.length})`}
              </button>
            )}
          </div>
        </div>

        {/* Subordinates */}
        {hasSubordinates && isExpanded && (
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-[#1E4947]/20" style={{ left: `${level * 2 + 1}rem` }} />
            {node.subordinates!.map(subNode => renderNode(subNode, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (employees.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-[#1E4947]/10">
        <Network className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-[#1E4947] text-lg font-medium mb-2">
          {t('employeesPage.orgchart.noData')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Group by company */}
      {['triple_c', 'cococo'].map(companyId => {
        const companyEmployees = employees.filter(e => e.companyId === companyId);
        if (companyEmployees.length === 0) return null;

        const companyHierarchy = buildHierarchy(companyEmployees);
        
        return (
          <div key={companyId} className="bg-white rounded-lg shadow-sm border border-[#1E4947]/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="w-6 h-6 text-[#FF79C9]" />
              <h2 className="text-xl font-semibold text-[#4D2B41]">
                {getCompanyName(companyId)}
              </h2>
              <span className="text-sm text-[#1E4947] bg-[#FFEFF8] px-3 py-1 rounded-full">
                {companyEmployees.length} {t('employeesPage.employees')}
              </span>
            </div>
            
            <div>
              {companyHierarchy.map(node => renderNode(node, 0))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
