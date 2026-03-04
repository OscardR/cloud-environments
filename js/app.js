document.getElementById("burgerMenu").addEventListener("click", function () {
  document.getElementById("headerNav").classList.toggle("show");
});

let data = {
  accounts: [],
  cidrs: [],
  clusters: [],
  adfs: [],
  tfe: [],
};

let filters = {
  applications: new Set(),
  environments: new Set(),
  regions: new Set(),
};

let tables = {};

let filterSelects = {};

let sortedApps, sortedEnvs, sortedRegions;

async function loadCSV(filename) {
  const response = await fetch(filename);
  const text = await response.text();
  return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
}

async function initData() {
  try {
    data.accounts = await loadCSV("data/account.csv");
    data.cidrs = await loadCSV("data/cidr.csv");
    data.clusters = await loadCSV("data/cluster.csv");
    data.adfs = await loadCSV("data/adfs.csv");
    data.tfe = await loadCSV("data/tfe.csv");

    extractFilters();
    initFilters();
    initTables();
    updateStats();
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

function extractFilters() {
  data.accounts.forEach((acc) => {
    filters.applications.add(acc.Application);
    filters.environments.add(acc.Environment);
  });

  data.cidrs.forEach((c) => filters.regions.add(c.Region));
  data.clusters.forEach((c) => filters.regions.add(c.Region));
}

function initFilters() {
  const sortedAppsList = Array.from(filters.applications).sort();
  const sortedEnvsList = Array.from(filters.environments).sort();
  const sortedRegionsList = Array.from(filters.regions).sort();

  sortedApps = sortedAppsList;
  sortedEnvs = sortedEnvsList;
  sortedRegions = sortedRegionsList;

  const options = {
    theme: "bootstrap-5",
    width: "100%",
    closeOnSelect: false,
    allowClear: true,
    placeholder: "Select...",
  };

  filterSelects.application = $("#filter-application");
  filterSelects.application.select2({
    ...options,
    data: sortedAppsList.map((v) => ({ id: v, text: v })),
    allowClear: false,
  });

  filterSelects.environment = $("#filter-environment");
  filterSelects.environment.select2({
    ...options,
    data: sortedEnvsList.map((v) => ({ id: v, text: v })),
    allowClear: false,
  });

  filterSelects.region = $("#filter-region");
  filterSelects.region.select2({
    ...options,
    data: sortedRegionsList.map((v) => ({ id: v, text: v })),
    allowClear: false,
  });

  filterSelects.application.on("change", handleFilterChange);
  filterSelects.environment.on("change", handleFilterChange);
  filterSelects.region.on("change", handleFilterChange);

  document
    .getElementById("clear-filters")
    .addEventListener("click", clearFilters);
}

function handleFilterChange() {
  filterTables();
}

function getSelectedFilters(type) {
  return filterSelects[type].val() || [];
}

function clearFilters() {
  filterSelects.application.val(sortedApps).trigger("change");
  filterSelects.environment.val(sortedEnvs).trigger("change");
  filterSelects.region.val(sortedRegions).trigger("change");
}

function getFilteredData() {
  const selectedApps = getSelectedFilters("application");
  const selectedEnvs = getSelectedFilters("environment");
  const selectedRegions = getSelectedFilters("region");

  const accountIds = new Set(
    data.accounts
      .filter(
        (acc) =>
          selectedApps.includes(acc.Application) &&
          selectedEnvs.includes(acc.Environment),
      )
      .map((acc) => acc.AccountId),
  );

  const appSet = new Set(selectedApps);

  return {
    accounts: data.accounts.filter(
      (acc) =>
        selectedApps.includes(acc.Application) &&
        selectedEnvs.includes(acc.Environment),
    ),
    cidrs: data.cidrs.filter(
      (cidr) =>
        accountIds.has(cidr.Account) && selectedRegions.includes(cidr.Region),
    ),
    clusters: data.clusters.filter(
      (cluster) =>
        accountIds.has(cluster.Account) &&
        selectedRegions.includes(cluster.Region),
    ),
    adfs: data.adfs.filter((adfs) => accountIds.has(adfs.Account)),
    tfe: data.tfe.filter((tfe) => appSet.has(tfe.Application)),
  };
}

function buildSummaryData(filteredData) {
  const summaryMap = new Map();

  filteredData.accounts.forEach((acc) => {
    const key = acc.AccountId;
    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        Application: acc.Application,
        Environment: acc.Environment,
        Account: acc.AccountId,
        Tiers: [],
        AWSRoles: [],
        TFERoles: [],
        CIDRs: [],
      });
    }
  });

  filteredData.clusters.forEach((cluster) => {
    const summary = summaryMap.get(cluster.Account);
    if (summary) {
      const tierUrl = cluster.URL
        ? `${cluster.Tier} | <a href="${cluster.URL}" target="_blank" class="summary-link">Open</a>`
        : cluster.Tier;
      summary.Tiers.push(tierUrl);
    }
  });

  filteredData.adfs.forEach((adfs) => {
    const summary = summaryMap.get(adfs.Account);
    if (summary) {
      summary.AWSRoles.push(adfs.AWSRoleName);
    }
  });

  filteredData.tfe.forEach((tfe) => {
    const summary = Array.from(summaryMap.values()).find(
      (s) => s.Application === tfe.Application,
    );
    if (summary) {
      summary.TFERoles.push(tfe.TFERoleName);
    }
  });

  filteredData.cidrs.forEach((cidr) => {
    const summary = summaryMap.get(cidr.Account);
    if (summary) {
      summary.CIDRs.push(`${cidr.Region} | ${cidr.CIDR}`);
    }
  });

  return Array.from(summaryMap.values()).map((s) => ({
    Application: s.Application,
    Environment: s.Environment,
    Account: s.Account,
    Tiers: s.Tiers.join("\n"),
    AWSRoles: s.AWSRoles.join("\n"),
    TFERoles: s.TFERoles.join("\n"),
    CIDRs: s.CIDRs.join("\n"),
  }));
}

function filterTables() {
  if (!data.accounts.length) return;

  const filteredData = getFilteredData();

  if (tables.accounts) {
    tables.accounts.clear();
    tables.accounts.rows.add(filteredData.accounts);
    tables.accounts.draw();
  }

  if (tables.cidrs) {
    tables.cidrs.clear();
    tables.cidrs.rows.add(filteredData.cidrs);
    tables.cidrs.draw();
  }

  if (tables.clusters) {
    tables.clusters.clear();
    tables.clusters.rows.add(filteredData.clusters);
    tables.clusters.draw();
  }

  if (tables.adfs) {
    tables.adfs.clear();
    tables.adfs.rows.add(filteredData.adfs);
    tables.adfs.draw();
  }

  if (tables.tfe) {
    tables.tfe.clear();
    tables.tfe.rows.add(filteredData.tfe);
    tables.tfe.draw();
  }

  if (tables.summary) {
    const summaryData = buildSummaryData(filteredData);
    tables.summary.clear();
    tables.summary.rows.add(summaryData);
    tables.summary.draw();
  }

  document.getElementById("account-count").textContent =
    filteredData.accounts.length;
  document.getElementById("cidr-count").textContent = filteredData.cidrs.length;
  document.getElementById("cluster-count").textContent =
    filteredData.clusters.length;
  document.getElementById("adfs-count").textContent = filteredData.adfs.length;
  document.getElementById("tfe-count").textContent = filteredData.tfe.length;
}

function updateStats() {
  document.getElementById("stat-accounts").textContent = data.accounts.length;
  document.getElementById("stat-cidrs").textContent = data.cidrs.length;
  document.getElementById("stat-clusters").textContent = data.clusters.length;
  document.getElementById("stat-adfs").textContent = data.adfs.length;
  document.getElementById("stat-tfe").textContent = data.tfe.length;
}

function initTables() {
  tables.summary = $("#table-summary").DataTable({
    data: buildSummaryData(getFilteredData()),
    columns: [
      { title: "Application", data: "Application" },
      {
        title: "Environment",
        data: "Environment",
        render: (data) => {
          const colors = {
            DEV: "success",
            UAT: "warning",
            RTB: "info",
            PROD: "danger",
          };
          return `<span class="badge bg-${colors[data] || "secondary"}">${data}</span>`;
        },
      },
      {
        title: "Account",
        data: "Account",
        render: (data) => `<code>${data}</code>`,
      },
      {
        title: "Tiers",
        data: "Tiers",
        render: (data) => (data ? `<div class="summary-cell">${data}</div>` : "-"),
      },
      {
        title: "AWS Roles",
        data: "AWSRoles",
        render: (data) =>
          data ? `<div class="summary-cell">${data}</div>` : "-",
      },
      {
        title: "TFE Roles",
        data: "TFERoles",
        render: (data) =>
          data ? `<div class="summary-cell">${data}</div>` : "-",
      },
      {
        title: "CIDRs",
        data: "CIDRs",
        render: (data) =>
          data ? `<div class="summary-cell">${data}</div>` : "-",
      },
    ],
    language: { search: "Search:", lengthMenu: "Show _MENU_ entries" },
    scrollX: true,
  });

  tables.accounts = $("#table-accounts").DataTable({
    data: data.accounts,
    columns: [
      {
        title: "Account ID",
        data: "AccountId",
        render: (data) => `<code>${data}</code>`,
      },
      { title: "Application", data: "Application" },
      {
        title: "Environment",
        data: "Environment",
        render: (data) => {
          const colors = {
            DEV: "success",
            UAT: "warning",
            RTB: "info",
            PROD: "danger",
          };
          return `<span class="badge bg-${colors[data] || "secondary"}">${data}</span>`;
        },
      },
    ],
    language: { search: "Search:", lengthMenu: "Show _MENU_ entries" },
  });

  tables.cidrs = $("#table-cidr").DataTable({
    data: data.cidrs,
    columns: [
      {
        title: "Account",
        data: "Account",
        render: (data) => `<code>${data}</code>`,
      },
      { title: "Region", data: "Region" },
      { title: "CIDR", data: "CIDR", render: (data) => `<code>${data}</code>` },
    ],
    language: { search: "Search:", lengthMenu: "Show _MENU_ entries" },
  });

  tables.clusters = $("#table-cluster").DataTable({
    data: data.clusters,
    columns: [
      {
        title: "Account",
        data: "Account",
        render: (data) => `<code>${data}</code>`,
      },
      { title: "Tier", data: "Tier" },
      { title: "Region", data: "Region" },
      {
        title: "URL",
        data: "URL",
        render: (data) =>
          data
            ? `<a href="${data}" target="_blank" class="cluster-link"><i class="bi bi-box-arrow-up-right"></i> Open</a>`
            : "-",
      },
    ],
    language: { search: "Search:", lengthMenu: "Show _MENU_ entries" },
  });

  tables.adfs = $("#table-adfs").DataTable({
    data: data.adfs,
    columns: [
      {
        title: "Account",
        data: "Account",
        render: (data) => `<code>${data}</code>`,
      },
      { title: "AWS Role Name", data: "AWSRoleName" },
    ],
    language: { search: "Search:", lengthMenu: "Show _MENU_ entries" },
  });

  tables.tfe = $("#table-tfe").DataTable({
    data: data.tfe,
    columns: [
      { title: "Application", data: "Application" },
      { title: "TFE Role Name", data: "TFERoleName" },
    ],
    language: { search: "Search:", lengthMenu: "Show _MENU_ entries" },
  });

  document.getElementById("account-count").textContent = data.accounts.length;
  document.getElementById("cidr-count").textContent = data.cidrs.length;
  document.getElementById("cluster-count").textContent = data.clusters.length;
  document.getElementById("adfs-count").textContent = data.adfs.length;
  document.getElementById("tfe-count").textContent = data.tfe.length;

  filterSelects.application.val(sortedApps).trigger("change");
  filterSelects.environment.val(sortedEnvs).trigger("change");
  filterSelects.region.val(sortedRegions).trigger("change");

  document.getElementById("summary-count").textContent = buildSummaryData(getFilteredData()).length;
}

$(document).ready(() => initData());
