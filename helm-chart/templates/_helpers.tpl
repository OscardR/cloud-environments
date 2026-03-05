{{/*
Expand the name of the chart.
*/}}
{{- define "cloud-environments.name" -}}
{{- $values := .Values | default (dict) -}}
{{- $values.nameOverride | default .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "cloud-environments.fullname" -}}
{{- $chart := .Chart | default (dict "Name" "cloud-environments") -}}
{{- $values := .Values | default (dict) -}}
{{- $fullnameOverride := $values.fullnameOverride | default "" -}}
{{- if $fullnameOverride }}
{{- $fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := $values.nameOverride | default $chart.Name -}}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "cloud-environments.chart" -}}
{{- $chart := .Chart | default (dict "Name" "cloud-environments" "Version" "0.1.0") -}}
{{- printf "%s-%s" $chart.Name $chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{/*
Common labels
*/}}
{{- define "cloud-environments.labels" -}}
helm.sh/chart: {{ include "cloud-environments.chart" . }}
{{ include "cloud-environments.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "cloud-environments.selectorLabels" -}}
app.kubernetes.io/name: {{ include "cloud-environments.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Construct image string
*/}}
{{- define "cloud-environments.image" -}}
{{- $values := .Values | default (dict) -}}
{{- $global := $values.global | default (dict "registry" "docker.io" "image" "nginx" "tag" "alpine") -}}
{{- printf "%s/%s:%s" $global.registry $global.image $global.tag -}}
{{- end }}
