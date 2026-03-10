{{/*
Expand the name of the chart.
*/}}
{{- define "amandate.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "amandate.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by chart label.
*/}}
{{- define "amandate.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels.
*/}}
{{- define "amandate.labels" -}}
helm.sh/chart: {{ include "amandate.chart" . }}
app.kubernetes.io/name: {{ include "amandate.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.commonLabels }}
{{- toYaml . }}
{{- end }}
{{- end -}}

{{/*
Selector labels.
*/}}
{{- define "amandate.selectorLabels" -}}
app.kubernetes.io/name: {{ include "amandate.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Component specific names.
*/}}
{{- define "amandate.backend.fullname" -}}
{{- printf "%s-backend" (include "amandate.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "amandate.frontend.fullname" -}}
{{- printf "%s-frontend" (include "amandate.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "amandate.configmapName" -}}
{{- printf "%s-config" (include "amandate.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "amandate.cnpgClusterName" -}}
{{- if .Values.database.cnpg.clusterName -}}
{{- .Values.database.cnpg.clusterName -}}
{{- else -}}
{{- printf "%s-db" (include "amandate.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "amandate.cnpgRwServiceName" -}}
{{- printf "%s-rw" (include "amandate.cnpgClusterName" .) -}}
{{- end -}}
