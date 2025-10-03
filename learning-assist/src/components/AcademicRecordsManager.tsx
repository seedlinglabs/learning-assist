import React, { useState, useEffect } from 'react';
import {
  AcademicRecordsService,
  AcademicRecord,
  CreateAcademicRecordRequest
} from '../services/academicRecordsService';
import { Plus, Edit2, Trash2, Search, Filter, ArrowLeft } from 'lucide-react';

interface AcademicRecordsManagerProps {
  onBack: () => void;
}

const AcademicRecordsManager: React.FC<AcademicRecordsManagerProps> = ({ onBack }) => {
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AcademicRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AcademicRecord | null>(null);
  
  // Filters
  const [filterSchool, setFilterSchool] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState<CreateAcademicRecordRequest>({
    school_id: 'content-development-school',
    academic_year: '2024-25',
    grade: '6',
    section: 'A',
    subject_id: '',
    subject_name: '',
    topic_id: '',
    topic_name: '',
    teacher_id: '',
    teacher_name: '',
    status: 'not_started',
    notes: ''
  });

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [records, filterSchool, filterYear, filterGrade, filterSection, filterStatus, searchQuery]);

  const loadRecords = async (schoolId?: string) => {
    setLoading(true);
    setError('');
    
    try {
      const data = await AcademicRecordsService.getRecordsBySchoolId(
        schoolId || 'content-development-school'
      );
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...records];

    if (filterSchool) {
      filtered = filtered.filter(r => r.school_id.includes(filterSchool));
    }
    if (filterYear) {
      filtered = filtered.filter(r => r.academic_year === filterYear);
    }
    if (filterGrade) {
      filtered = filtered.filter(r => r.grade === filterGrade);
    }
    if (filterSection) {
      filtered = filtered.filter(r => r.section === filterSection);
    }
    if (filterStatus) {
      filtered = filtered.filter(r => r.status === filterStatus);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.subject_name.toLowerCase().includes(query) ||
        r.topic_name.toLowerCase().includes(query) ||
        (r.teacher_name && r.teacher_name.toLowerCase().includes(query))
      );
    }

    setFilteredRecords(filtered);
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await AcademicRecordsService.createRecord(formData);
      setShowCreateForm(false);
      resetForm();
      loadRecords(formData.school_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create record');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    setLoading(true);
    setError('');

    try {
      await AcademicRecordsService.updateRecord(
        editingRecord.record_id,
        editingRecord.topic_id,
        {
          status: formData.status,
          teacher_id: formData.teacher_id,
          teacher_name: formData.teacher_name,
          subject_name: formData.subject_name,
          topic_name: formData.topic_name,
          notes: formData.notes
        }
      );
      setEditingRecord(null);
      resetForm();
      loadRecords(editingRecord.school_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update record');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (record: AcademicRecord) => {
    if (!window.confirm(`Delete record for ${record.topic_name}?`)) return;

    setLoading(true);
    setError('');

    try {
      await AcademicRecordsService.deleteRecord(record.record_id, record.topic_id);
      loadRecords(record.school_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (record: AcademicRecord) => {
    setEditingRecord(record);
    setFormData({
      school_id: record.school_id,
      academic_year: record.academic_year,
      grade: record.grade,
      section: record.section,
      subject_id: record.subject_id,
      subject_name: record.subject_name,
      topic_id: record.topic_id,
      topic_name: record.topic_name,
      teacher_id: record.teacher_id || '',
      teacher_name: record.teacher_name || '',
      status: record.status,
      notes: record.notes || ''
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      school_id: 'content-development-school',
      academic_year: '2024-25',
      grade: '6',
      section: 'A',
      subject_id: '',
      subject_name: '',
      topic_id: '',
      topic_name: '',
      teacher_id: '',
      teacher_name: '',
      status: 'not_started',
      notes: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': return '#9E9E9E';
      case 'in_progress': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'on_hold': return '#FF9800';
      case 'cancelled': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <div className="academic-records-manager">
      <div className="manager-header">
        <button onClick={onBack} className="back-btn">
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        <h1>Academic Records Management</h1>
        <p>Manage academic year, grades, sections, subjects, topics, teachers, and parent assignments</p>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by subject, topic, teacher, or parent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setShowCreateForm(true);
            setEditingRecord(null);
            resetForm();
          }}
        >
          <Plus size={18} />
          Add Record
        </button>
      </div>

      <div className="filters-bar">
        <Filter size={18} />
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
          <option value="">All Years</option>
          <option value="2024-25">2024-25</option>
          <option value="2025-26">2025-26</option>
          <option value="2026-27">2026-27</option>
        </select>
        <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
          <option value="">All Grades</option>
          {[...Array(10)].map((_, i) => (
            <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
          ))}
        </select>
        <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
          <option value="">All Sections</option>
          {['A', 'B', 'C', 'D'].map(section => (
            <option key={section} value={section}>{section}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {(filterYear || filterGrade || filterSection || filterStatus) && (
          <button
            className="btn-link"
            onClick={() => {
              setFilterYear('');
              setFilterGrade('');
              setFilterSection('');
              setFilterStatus('');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingRecord ? 'Edit Record' : 'Create New Record'}</h2>
              <button onClick={() => setShowCreateForm(false)}>×</button>
            </div>
            <form onSubmit={editingRecord ? handleUpdateRecord : handleCreateRecord}>
              <div className="form-grid">
                <div className="form-group">
                  <label>School ID *</label>
                  <input
                    type="text"
                    value={formData.school_id}
                    onChange={(e) => setFormData({...formData, school_id: e.target.value})}
                    disabled={!!editingRecord}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Academic Year *</label>
                  <input
                    type="text"
                    value={formData.academic_year}
                    onChange={(e) => setFormData({...formData, academic_year: e.target.value})}
                    placeholder="2024-25"
                    disabled={!!editingRecord}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Grade *</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({...formData, grade: e.target.value})}
                    disabled={!!editingRecord}
                    required
                  >
                    {[...Array(10)].map((_, i) => (
                      <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Section *</label>
                  <select
                    value={formData.section}
                    onChange={(e) => setFormData({...formData, section: e.target.value})}
                    disabled={!!editingRecord}
                    required
                  >
                    {['A', 'B', 'C', 'D'].map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Subject ID *</label>
                  <input
                    type="text"
                    value={formData.subject_id}
                    onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                    disabled={!!editingRecord}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Subject Name *</label>
                  <input
                    type="text"
                    value={formData.subject_name}
                    onChange={(e) => setFormData({...formData, subject_name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Topic ID *</label>
                  <input
                    type="text"
                    value={formData.topic_id}
                    onChange={(e) => setFormData({...formData, topic_id: e.target.value})}
                    disabled={!!editingRecord}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Topic Name *</label>
                  <input
                    type="text"
                    value={formData.topic_name}
                    onChange={(e) => setFormData({...formData, topic_name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Teacher ID</label>
                  <input
                    type="text"
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({...formData, teacher_id: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Teacher Name</label>
                  <input
                    type="text"
                    value={formData.teacher_name}
                    onChange={(e) => setFormData({...formData, teacher_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    required
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingRecord ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && !showCreateForm ? (
        <div className="loading-spinner">Loading records...</div>
      ) : (
        <div className="records-table-container">
          <table className="records-table">
            <thead>
              <tr>
                <th>Academic Year</th>
                <th>Grade/Section</th>
                <th>Subject</th>
                <th>Topic</th>
                <th>Teacher</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No records found. Create your first academic record to get started.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={`${record.record_id}-${record.topic_id}`}>
                    <td>{record.academic_year}</td>
                    <td>{record.grade}{record.section}</td>
                    <td>{record.subject_name}</td>
                    <td>{record.topic_name}</td>
                    <td>{record.teacher_name || '—'}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(record.status) }}
                      >
                        {record.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => startEdit(record)}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => handleDeleteRecord(record)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .academic-records-manager {
          padding: 24px;
          max-width: 1600px;
          margin: 0 auto;
        }

        .manager-header {
          margin-bottom: 32px;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          cursor: pointer;
          margin-bottom: 16px;
          transition: all 0.2s;
        }

        .back-btn:hover {
          background: var(--hover-bg);
        }

        .manager-header h1 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .manager-header p {
          font-size: 16px;
          color: var(--text-secondary);
        }

        .error-banner {
          background: #f443361a;
          border: 1px solid #f44336;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-banner span {
          color: #f44336;
        }

        .error-banner button {
          background: none;
          border: none;
          color: #f44336;
          font-size: 20px;
          cursor: pointer;
        }

        .toolbar {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }

        .search-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }

        .search-box input {
          flex: 1;
          border: none;
          background: none;
          outline: none;
        }

        .filters-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding: 16px;
          background: var(--card-bg);
          border-radius: 8px;
        }

        .filters-bar select {
          padding: 6px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-primary);
        }

        .btn-link {
          background: none;
          border: none;
          color: var(--accent-color);
          cursor: pointer;
          text-decoration: underline;
        }

        .records-table-container {
          background: var(--card-bg);
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }

        .records-table {
          width: 100%;
          border-collapse: collapse;
        }

        .records-table th {
          background: var(--bg-secondary);
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border-color);
        }

        .records-table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .records-table tbody tr:hover {
          background: var(--hover-bg);
        }

        .records-table small {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .empty-state {
          text-align: center;
          padding: 48px !important;
          color: var(--text-secondary);
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-icon {
          padding: 6px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .btn-icon:hover {
          background: var(--hover-bg);
        }

        .btn-icon.btn-danger:hover {
          background: #f443361a;
          border-color: #f44336;
          color: #f44336;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: var(--bg-primary, #ffffff);
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        /* Light theme overrides */
        :root {
          --modal-bg: #ffffff;
          --modal-border: #e0e0e0;
        }

        /* Dark theme overrides */
        [data-theme="dark"] .modal-content {
          background: #2d2d2d;
          border-color: #404040;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
        }

        .modal-header h2 {
          margin: 0;
        }

        .modal-header button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          padding: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 8px 12px;
          border: 1px solid var(--border-color, #d0d0d0);
          border-radius: 6px;
          background: var(--bg-primary, #ffffff);
          color: var(--text-primary, #000000);
        }

        [data-theme="dark"] .form-group input,
        [data-theme="dark"] .form-group select,
        [data-theme="dark"] .form-group textarea {
          background: #1a1a1a;
          border-color: #404040;
          color: #ffffff;
        }

        .form-group input:disabled,
        .form-group select:disabled {
          background: var(--bg-secondary);
          cursor: not-allowed;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid var(--border-color);
        }

        .btn {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-primary {
          background: var(--accent-color);
          color: white;
        }

        .btn-primary:hover {
          opacity: 0.9;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
        }

        .btn-secondary:hover {
          background: var(--hover-bg);
        }

        .loading-spinner {
          text-align: center;
          padding: 48px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};

export default AcademicRecordsManager;

