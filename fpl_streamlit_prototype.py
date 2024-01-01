#------------------------------
# Imports
#------------------------------


import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px


#------------------------------
# Part 1
#------------------------------

st.subheader("Load data")

@st.cache
def load_data():
	data=pd.read_csv('/Users/nano/Documents/GitHub/Fantasy-Premier-League/data/2023-24/cleaned_players.csv')

	return data

data=load_data()

if st.checkbox("Show raw data"):
	st.dataframe(data)

df=data.copy()

st.write("Start Exploring Using the Left Menu")

st.subheader('Get Player Data')

min_points=df.total_points.min()
max_points=df.total_points.max()

MinutesFilter = st.sidebar.slider('Minutes :', 0, int(df.minutes.max())) # TODO : Replace this
PositionFilter = st.sidebar.multiselect('Position :',df.element_type.unique(),df.element_type.unique())
PointFilter = st.sidebar.slider('Points :',int(min_points),int(max_points) )

df['points_per_90']=df.total_points*90/df.minutes
df['points_per_min']=df.total_points/df.minutes
df['full_name']=df.first_name+' '+df.second_name

output=df[(df.minutes>=MinutesFilter)&(df.element_type.isin(PositionFilter))]


key_cols=['full_name','element_type','total_points','points_per_90','points_per_min','goals_scored','assists','clean_sheets','selected_by_percent','now_cost','minutes']
output=output[key_cols].sort_values('total_points',ascending=False)

st.dataframe(output)


#---------------------------------
# Visualize trough scatterplot
#---------------------------------
st.subheader('Overview of 2022/23 Season')
fig=px.scatter(output,
	x='minutes',
	y='points_per_90',
	size='total_points',
	# text='first_name',
	hover_data=["full_name"],
	color='element_type',
	color_discrete_sequence=px.colors.qualitative.D3,

	title='Points per 90 vs Minutes',
	height=600,
	width=800)

fig.update_traces(marker=dict(
                              line=dict(width=0.5,
                                        color='white')),
                  selector=dict(mode='markers'))
fig.update_xaxes(range=(output.minutes.min(),output.minutes.max()*1.1),title='Minutes Played')
fig.update_yaxes(range=(output.points_per_90.min(),output.points_per_90.max()*1.1),title='Points per Game')

player_selection=st.sidebar.selectbox('Highlight player :',output.full_name)

fig.add_traces(
    px.scatter(output[output.full_name==player_selection], x="minutes", y="points_per_90").update_traces(marker_size=30, marker_color="white").data
)

st.plotly_chart(fig)

metric_bar_chart=st.selectbox('Metric: ',['total_points','points_per_90','points_per_min','goals_scored','assists','clean_sheets','selected_by_percent','now_cost','minutes'])

fig=px.bar(output.sort_values(metric_bar_chart,ascending=False).head(100),
	x='full_name',
	y=metric_bar_chart,
	orientation='v',
	height=800,
	width=1000,
	color='element_type'
	)

st.plotly_chart(fig)

group=st.radio('Position',('FWD','MID','DEF','GK'))

fig=px.bar(output[output.element_type==group].sort_values('points_per_90',ascending=False).head(20),
	x='points_per_90',
	y='full_name',
	orientation='h',
	title='Points Per Game',
	height=800,
	color='minutes',
	color_continuous_scale='amp'
	)

fig.update_layout(yaxis={'categoryorder':'total ascending'})

st.plotly_chart(fig)

fig=px.sunburst(output,
	path=['element_type','full_name'],
	values='total_points',
	title='Points Distribution',
	color='minutes',
	height=800,
	color_continuous_scale='solar')

st.plotly_chart(fig)





#-----------
# Parking Lot
#-----------
# st.line_chart(df)
# st.table(df)
# st.map(df)

# sorted_df=output[output.element_type==group].sort_values('points_per_90',ascending=True).head(20)
# st.bar_chart(
# 	sorted_df,
# 	x='full_name',
# 	y='points_per_90')


# st.slider() 
# st.button() 
# st.radio(title, all options)
# st.checkbox() - Does something if a condition is met
# st.selectbox() - takes a text and then a series
# st.radio. Can hold the with to organise
# The above can have st.sidebar.slider to put on side
# add_slider = st.sidebar.slider(
#    'Select a range of values',
#    0.0, 100.0, (25.0, 75.0))


# Layout
# left_column, right_column = st.columns(2)
# left_column.button('press')
# st.header, st.subheader()
