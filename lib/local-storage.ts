'use client';

export interface StoredChat {
  id: string;
  title?: string;
  messages: StoredMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface StoredMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  createdAt: string;
  isEdited?: boolean;
  editedAt?: string;
  parentId?: string;
  files?: StoredFile[];
  graphs?: StoredGraph[];
}

export interface StoredFile {
  id: string;
  originalName: string;
  filename: string;
  size: number;
  mimetype: string;
  data?: {
    headers: string[];
    rows: any[][];
    type: 'csv' | 'json' | 'excel';
  };
}

export interface StoredGraph {
  id: string;
  title: string;
  description?: string;
  chartType: string;
  chartConfig: any;
  data: any;
  version: number;
  originalGraphId?: string;
  createdAt: string;
}

export interface StoredDashboard {
  id: string;
  title: string;
  description?: string;
  isPublic?: boolean;
  shareId?: string | null;
  items: string[]; // Array of graph IDs
  layout?: any;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEYS = {
  CHATS: 'graph-ai-chats',
  GRAPHS: 'graph-ai-graphs',
  DASHBOARDS: 'graph-ai-dashboards',
  USER_PREFERENCES: 'graph-ai-preferences',
};

class LocalStorage {
  // Chat management
  getChats(): StoredChat[] {
    if (typeof window === 'undefined') return [];
    const chats = window.localStorage.getItem(STORAGE_KEYS.CHATS);
    return chats ? JSON.parse(chats) : [];
  }

  saveChat(chat: StoredChat): void {
    if (typeof window === 'undefined') return;
    const chats = this.getChats();
    const existingIndex = chats.findIndex(c => c.id === chat.id);
    
    if (existingIndex >= 0) {
      chats[existingIndex] = { ...chat, updatedAt: new Date().toISOString() };
    } else {
      chats.push(chat);
    }
    
    window.localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
  }

  getChat(id: string): StoredChat | null {
    const chats = this.getChats();
    return chats.find(c => c.id === id) || null;
  }

  deleteChat(id: string): void {
    if (typeof window === 'undefined') return;
    const chats = this.getChats().filter(c => c.id !== id);
    window.localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
  }

  // Message management
  addMessage(chatId: string, message: StoredMessage): void {
    const chat = this.getChat(chatId);
    if (chat) {
      chat.messages.push(message);
      this.saveChat(chat);
    }
  }

  updateMessage(chatId: string, messageId: string, updates: Partial<StoredMessage>): void {
    const chat = this.getChat(chatId);
    if (chat) {
      const messageIndex = chat.messages.findIndex(m => m.id === messageId);
      if (messageIndex >= 0) {
        chat.messages[messageIndex] = { 
          ...chat.messages[messageIndex], 
          ...updates,
          isEdited: true,
          editedAt: new Date().toISOString()
        };
        this.saveChat(chat);
      }
    }
  }

  // Graph management
  getGraphs(): StoredGraph[] {
    if (typeof window === 'undefined') return [];
    const graphs = window.localStorage.getItem(STORAGE_KEYS.GRAPHS);
    return graphs ? JSON.parse(graphs) : [];
  }

  saveGraph(graph: StoredGraph): void {
    if (typeof window === 'undefined') return;
    const graphs = this.getGraphs();
    const existingIndex = graphs.findIndex(g => g.id === graph.id);
    
    if (existingIndex >= 0) {
      graphs[existingIndex] = graph;
    } else {
      graphs.push(graph);
    }
    
    window.localStorage.setItem(STORAGE_KEYS.GRAPHS, JSON.stringify(graphs));
  }

  getGraph(id: string): StoredGraph | null {
    const graphs = this.getGraphs();
    return graphs.find(g => g.id === id) || null;
  }

  getGraphVersions(originalGraphId: string): StoredGraph[] {
    const graphs = this.getGraphs();
    return graphs.filter(g => g.originalGraphId === originalGraphId).sort((a, b) => b.version - a.version);
  }

  deleteGraph(id: string): void {
    if (typeof window === 'undefined') return;
    const graphs = this.getGraphs().filter(g => g.id !== id);
    window.localStorage.setItem(STORAGE_KEYS.GRAPHS, JSON.stringify(graphs));
  }

  // Dashboard management
  getDashboards(): StoredDashboard[] {
    if (typeof window === 'undefined') return [];
    const dashboards = window.localStorage.getItem(STORAGE_KEYS.DASHBOARDS);
    return dashboards ? JSON.parse(dashboards) : [];
  }

  saveDashboard(dashboard: StoredDashboard): void {
    if (typeof window === 'undefined') return;
    const dashboards = this.getDashboards();
    const existingIndex = dashboards.findIndex(d => d.id === dashboard.id);
    
    if (existingIndex >= 0) {
      dashboards[existingIndex] = { ...dashboard, updatedAt: new Date().toISOString() };
    } else {
      dashboards.push(dashboard);
    }
    
    window.localStorage.setItem(STORAGE_KEYS.DASHBOARDS, JSON.stringify(dashboards));
  }

  getDashboard(id: string): StoredDashboard | null {
    const dashboards = this.getDashboards();
    return dashboards.find(d => d.id === id) || null;
  }

  deleteDashboard(id: string): void {
    if (typeof window === 'undefined') return;
    const dashboards = this.getDashboards().filter(d => d.id !== id);
    window.localStorage.setItem(STORAGE_KEYS.DASHBOARDS, JSON.stringify(dashboards));
  }

  // User preferences
  getUserPreferences(): any {
    if (typeof window === 'undefined') return {};
    const prefs = window.localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    return prefs ? JSON.parse(prefs) : {};
  }

  saveUserPreference(key: string, value: any): void {
    if (typeof window === 'undefined') return;
    const prefs = this.getUserPreferences();
    prefs[key] = value;
    window.localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(prefs));
  }

  // Clear all data
  clearAll(): void {
    if (typeof window === 'undefined') return;
    Object.values(STORAGE_KEYS).forEach(key => {
      window.localStorage.removeItem(key);
    });
  }

  // Export data for synchronization
  exportData(): {
    chats: StoredChat[];
    graphs: StoredGraph[];
    dashboards: StoredDashboard[];
    preferences: any;
  } {
    return {
      chats: this.getChats(),
      graphs: this.getGraphs(),
      dashboards: this.getDashboards(),
      preferences: this.getUserPreferences(),
    };
  }

  // Import data from server
  importData(data: {
    chats?: StoredChat[];
    graphs?: StoredGraph[];
    dashboards?: StoredDashboard[];
    preferences?: any;
  }): void {
    if (typeof window === 'undefined') return;
    
    if (data.chats) {
      window.localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(data.chats));
    }
    if (data.graphs) {
      window.localStorage.setItem(STORAGE_KEYS.GRAPHS, JSON.stringify(data.graphs));
    }
    if (data.dashboards) {
      window.localStorage.setItem(STORAGE_KEYS.DASHBOARDS, JSON.stringify(data.dashboards));
    }
    if (data.preferences) {
      window.localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(data.preferences));
    }
  }
}

export const localStorageManager = new LocalStorage();