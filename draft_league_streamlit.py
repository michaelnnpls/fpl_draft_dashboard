#------------------------------------------------------------
# Imports
#------------------------------------------------------------


import streamlit as st
st.set_page_config(layout="wide")
import pandas as pd
import numpy as np
import plotly.express as px
import requests
import json 
from matplotlib import pyplot as plt


team_color_dict={
'Baconators':'#fe4a49',
'Jane United':'#2ab7ca',
'Diego FC': '#fed766',
'Poch It Real Good FC':'#F9E6AF',
'Put it in harder':'#f4f4f8',
'FC Habibi':'#94818A',
'The Average Team':'#94C798'
}

config = {
'toImageButtonOptions': {
    'format': 'svg', # one of png, svg, jpeg, webp
    'filename': 'custom_image',
    'height': 500,
    'width': 700,
    'scale': 1 # Multiply title/legend/axis/canvas sizes by this factor
    }
    }

def clean_bar_fig(figure):
	figure.update_traces(
		marker_line_color='white',
		marker_line_width=1.5,
		textposition='inside'
		)
	figure.update_layout(showlegend=False,
		font_family="Roboto",
              # xaxis_title="",
              # yaxis_title=""
              )


st.header("Welcome to our FPL Draft League Dash")

#------------------------------------------------------------
# Load Data
#------------------------------------------------------------

st.subheader("Load data")

@st.cache_data(show_spinner="Fetching data from API and manipulating it",ttl=43200)
def load_data():
	# Create next gw variable
	#------------------------------
	r=requests.get('https://draft.premierleague.com/api/bootstrap-static')  # Generic endpoint with a bunch of data
	next_gw=json.loads(r.content)['events']['next']

	# Get element (player) meta data
	#------------------------------
	teams=pd.json_normalize(json.loads(r.content)['teams'])[['id','code','short_name','name']]
	positions=pd.json_normalize(json.loads(r.content)['element_types'])[['id','singular_name_short']]

	# Get all the element info this season and create player_df dataframe
	columns=['id','web_name','total_points','expected_goal_involvements','minutes','team','news','starts','element_type']
	summary=pd.json_normalize(json.loads(r.content)['elements']) # This has data to date

	players_df=summary[columns].merge(teams,left_on='team',right_on='id',suffixes=('','_teams'))
	players_df=players_df.merge(positions,left_on='element_type',right_on='id',suffixes=('','_positions'))
	players_df.rename(columns={'name':'team_name',
		'short_name':'team_short_name',
		'singular_name_short':'position_short_name'},
	                           inplace=True) # Keeping what's needed for players


	# Create Player-Match Data Frame with all the stats
	#------------------------------------------------------------

	elements=players_df.id.to_list() # Go through all the players
	output=pd.DataFrame()

	for gw in range(1,next_gw): # Loop through the gw stats
		stats_response=json.loads(requests.get('https://draft.premierleague.com/api/event/'+str(gw)+'/live').content)['elements']
		for e,p in zip(players_df.id,players_df.web_name):
			try:
				data_player_gw=pd.json_normalize(stats_response[str(e)]['stats'])
				data_player_gw['element']=e
				data_player_gw['gameweek']=gw
				output=pd.concat([output,data_player_gw],axis=0)
			except:
				pass

	match_data=output.merge(players_df[['id','web_name','team_name','team_short_name','position_short_name']],left_on=['element'],right_on=['id']) # Simply add the relevant meta data for the players


	# This end point uses our league and gets the choices in the draft
	#------------------------------------------------------------

	choices=requests.get('https://draft.premierleague.com/api/draft/24706/choices')
	teams_draft_picks=pd.json_normalize(json.loads(choices.content)['choices']) # This has the draft picks

	teams_fpl=teams_draft_picks[['entry','entry_name']].drop_duplicates(['entry','entry_name']) # This has just the ids and the name of the teams to loop through



	# Now for a given player in the FPL League (got to loop through)
	#------------------------------------------------------------

	picks=pd.DataFrame()
	subs=pd.DataFrame()

	for entry,entry_name in zip(teams_fpl.entry,teams_fpl.entry_name): # loop through each fpl team
		for i in range(1,next_gw):
		    c=requests.get('https://draft.premierleague.com/api/entry/'+str(entry)+'/event/'+str(i)).content # this has weekly stats 
		    subs_df=pd.json_normalize(json.loads(c)['subs'])
		    picks_df=pd.json_normalize(json.loads(c)['picks'])
		    picks_df['gameweek']=i
		    picks_df['fpl_team']=entry_name
		    subs_df['gameweek']=i
		    subs=pd.concat([subs,subs_df],axis=0) # This won't be used as the picks final already processed
		    picks=pd.concat([picks,picks_df],axis=0)

	picks['lineup']=np.where(picks.position<12,'On Field','Sub')

	# Prep the dataframe. This steps merges the points data with the weekly picks
	#------------------------------------------------------------
	draft_match_data=picks.merge(match_data[['element','gameweek','minutes','web_name','team_name','team_short_name','total_points','position_short_name']],on=['element','gameweek'])

	

	return draft_match_data,teams_draft_picks,match_data,next_gw

draft_match_data,teams_draft_picks,match_data,next_gw=load_data()

st.write('Data is loaded')
st.divider()


#--------------
# Analysis Section
#--------------

# Create the aggregate df to data
#------------------------------------------------------------
aggregate_df=draft_match_data[draft_match_data.lineup=='On Field'].groupby('fpl_team').total_points.sum().sort_values(ascending=False).reset_index()
rankings=aggregate_df.fpl_team.tolist()


# Viz Totals , momentum and  player contributions
#------------------------------------------------------------

fig_bar=px.bar(aggregate_df,
	y='fpl_team',
	x='total_points',
	color='fpl_team',
	opacity=0.8,
	text_auto=True,
	color_discrete_map=team_color_dict,

	labels={'fpl_team':'FPL Team','total_points':'Total Points'},
	template='plotly_dark')

clean_bar_fig(fig_bar)

aggregate_momentum_df=draft_match_data[(draft_match_data.lineup=='On Field')&(draft_match_data.gameweek>next_gw-5)].groupby('fpl_team').total_points.sum().reset_index()
aggregate_momentum_df["fpl_team"] = pd.Categorical(aggregate_momentum_df["fpl_team"], categories = rankings)


fig_momentum=px.bar(aggregate_momentum_df.sort_values('fpl_team'),y='fpl_team',
	x='total_points',
	color='fpl_team',
	opacity=0.8,
	text_auto=True,
	color_discrete_map=team_color_dict,

	labels={'fpl_team':'FPL Team','total_points':'Total Points (Past 4 GW)'},
	template='plotly_dark')


clean_bar_fig(fig_momentum)


aggregate_player_df=draft_match_data[(draft_match_data.lineup=='On Field')&(draft_match_data.gameweek<18)].groupby(['fpl_team','web_name']).total_points.sum().reset_index()
aggregate_player_df.groupby('fpl_team').total_points.sum().sort_values(ascending=False)


viz=aggregate_player_df.copy()
viz['coloring']=viz.total_points

fig_sun = px.sunburst(
	viz,
	path=['fpl_team','web_name'],
	values='total_points',
	color='fpl_team',
	color_discrete_map=team_color_dict,
	template='plotly_dark'

	)

fig_sun.update_traces(
	marker_line_color='white',
                  #marker_line_width=1.5,
                  #textposition='outside'
                  )
fig_sun.update_layout(showlegend=False,
	font_family="Roboto"
	)

col1, col2, col3  = st.columns(3)

with col1:
	st.subheader("Current Rankings: Total Points")
	st.plotly_chart(fig_bar,use_container_width=True)

with col2:
	st.subheader("Momentum: Points the last 4 GW")
	st.plotly_chart(fig_momentum,use_container_width=True)

with col3:
	st.subheader("Which players provide the points")
	st.plotly_chart(fig_sun,use_container_width=True)


# Team performance - points left on bench and rotated/injured players
#------------------------------------------------------------

bp_df=draft_match_data[draft_match_data.lineup=='Sub'].groupby('fpl_team').total_points.sum().reset_index().sort_values('total_points',ascending=False)

fig_bench=px.bar(bp_df,y='total_points',x='fpl_team',color='fpl_team',
	opacity=0.8,
	text_auto=True,
	labels=dict(total_points="Points Left on Bench", fpl_team=""),
	color_discrete_map=team_color_dict,
	template='plotly_dark'
	)

fig_bench.update_traces(
	marker_line_color='white',
	marker_line_width=1.5,
	textposition='outside'
	)

fig_bench.update_layout(showlegend=False,
	font_family="Roboto"
	)


viz_rotation=draft_match_data[draft_match_data.minutes==0].groupby(['fpl_team']).gameweek.count().sort_values(ascending=False).reset_index()
fig_rotation=px.bar(
	viz_rotation,
	y='gameweek',x='fpl_team',
	color='fpl_team',
	opacity=0.8,
	text_auto=True,
	labels=dict(gameweek="Rotated or Injured Players", fpl_team=""),
	color_discrete_map=team_color_dict,
	template='plotly_dark'
	)

fig_rotation.update_traces(
	marker_line_color='white',
      marker_line_width=1.5, #opacity=0.6
      textposition='outside'
      )


fig_rotation.update_layout(showlegend=False,
	font_family="Roboto"
	)


col3, col4  = st.columns(2)

with col3:
	st.subheader("Benched Points")
	st.plotly_chart(fig_bench,use_container_width=True)
with col4:
	st.subheader("# Players with 0 minutes (Injured/Rotated)")
	st.plotly_chart(fig_rotation,use_container_width=True)



# Weekly Trend
#------------------------------------------------------------
weekly_team_trend=draft_match_data[draft_match_data.lineup=='On Field'].groupby(['gameweek','fpl_team']).total_points.sum().reset_index()
weekly_team_trend["fpl_team"] = pd.Categorical(weekly_team_trend["fpl_team"], categories = rankings)




fig_weekly=px.bar(weekly_team_trend.sort_values('fpl_team'),
	y='total_points',
	x='gameweek',
	facet_row="fpl_team",
	color='fpl_team',
	color_discrete_map=team_color_dict, 
	template='plotly_dark',
	text_auto=True,
	height=800,
	facet_row_spacing=0.005,
	labels=dict(total_points="", gameweek="Game Week"),
	)

fig_weekly.update_layout(showlegend=False,
	font_family="Roboto"
	)

fig_weekly.update_traces(
	marker_line_color='white',
                  marker_line_width=1.5, #opacity=0.6
                  textposition='inside'
                  )

fig_weekly.for_each_annotation(lambda a: a.update(text=a.text.split("=")[-1]))

st.subheader('Weekly Points | Based on current rank')
st.plotly_chart(fig_weekly,use_container_width=True)

fig_consistency=px.box(weekly_team_trend.sort_values('fpl_team'),
	title='Consistency',
	y='total_points',
	x='fpl_team',
	color='fpl_team',
	color_discrete_map=team_color_dict,
	points="all",
	template='plotly_dark',
	labels=dict(total_points="Weekly Points", fpl_team="FPL Team"),
	)

fig_consistency.update_traces(opacity=1)

fig_consistency.update_layout(showlegend=False,
	font_family="Roboto"
	)

st.plotly_chart(fig_consistency,use_container_width=True)



# Analysis of picks
#------------------------------------------------------------
pick_analysis_df=teams_draft_picks[['element','pick','round','entry_name']]
pick_analysis_df=draft_match_data.merge(pick_analysis_df,left_on=['element','fpl_team'],right_on=['element','entry_name'],how='left')
pick_analysis_df['label']=np.where(pick_analysis_df.pick.isna(),'Transfer',
	pick_analysis_df.web_name+' | Pick: '+pick_analysis_df['round'].fillna(0).astype(int).astype(str))

pick_analysis_df['pick_bucket']=np.where(pick_analysis_df['round']<4,'3 First Picks',np.where(pick_analysis_df['round'].isna(),'Transfer','Other Picks'))


# Picks
top_picks=pick_analysis_df[pick_analysis_df.label!='Transfer'].groupby(['label','fpl_team']).total_points.sum().sort_values(ascending=False).head(20).reset_index()
fig_top_picks=px.bar(top_picks.sort_values('total_points'),
	#title='Best picks performance',
	y='label',
	x='total_points',
	color='fpl_team',
	opacity=0.8,
	text_auto=True,
	color_discrete_map=team_color_dict,

	labels={'fpl_team':'FPL Team','total_points':'Total Points (Past 4 GW)'},
	template='plotly_dark')

fig_top_picks.update_layout(yaxis={'categoryorder':'total ascending'})

fig_top_picks.update_traces(
	marker_line_color='white',
	marker_line_width=1.5,
	textposition='outside'
	)
fig_top_picks.update_layout(showlegend=False,
	font_family="Roboto",
	xaxis_title="Points",
	yaxis_title=""
	)


# Analysis of transfers
#------------------------------------------------------------

transfers=pick_analysis_df[pick_analysis_df.label=='Transfer'].groupby(['web_name','fpl_team']).total_points.sum().sort_values(ascending=False).head(20).reset_index()
fig_top_transfers=px.bar(transfers.sort_values('total_points'),
	y='web_name',
	x='total_points',
	color='fpl_team',
	opacity=0.8,
	text_auto=True,
	color_discrete_map=team_color_dict,

   labels={'fpl_team':'FPL Team','total_points':'Total Points (Past 4 GW)'},
   template='plotly_dark')

fig_top_transfers.update_layout(yaxis={'categoryorder':'total ascending'})

fig_top_transfers.update_traces(
	marker_line_color='white',
	marker_line_width=1.5,
	textposition='outside'
	)
fig_top_transfers.update_layout(showlegend=True,
	font_family="Roboto",
	xaxis_title="Points",
	yaxis_title=""
	)
st.header('Pick and Transfer Analysis')

col6,col7=st.columns(2)
with col6:

	st.plotly_chart(fig_top_picks,use_container_width=True)
	with col7:
		st.plotly_chart(fig_top_transfers,use_container_width=True)


		distribution_df=pick_analysis_df.groupby(['fpl_team','pick_bucket']).total_points.sum().reset_index()
		distribution_df['share_of_points']=(distribution_df.total_points/distribution_df.groupby('fpl_team').total_points.transform('sum')).round(3)
		distribution_df['share_of_points_text']=(distribution_df.share_of_points*100).map('{:,.1f}%'.format)
		distribution_df["fpl_team"] = pd.Categorical(distribution_df["fpl_team"], categories = rankings)



# Distribution of pick contribution
#------------------------------------------------------------
fig_distrib=px.bar(distribution_df.sort_values(['fpl_team','pick_bucket'],ascending=False),
	y='fpl_team',
	x='share_of_points',
	color='pick_bucket',
	color_discrete_map={
		'3 First Picks':'#f37735',
		'Other Picks':'#ffc425',
		'Transfer':'#00aedb'
		},
   labels=dict(share_of_points='% Points per Player Origin',fpl_team=""),
   text='share_of_points_text',
   barmode='stack',
   template='plotly_dark')

fig_distrib.update_traces(
	textposition='inside',
	insidetextfont=dict(family='Roboto', size=14, color='white'),
	insidetextanchor='middle')

fig_distrib.update_layout(showlegend=True,
	font_family="Roboto"
	)

st.plotly_chart(fig_distrib,use_container_width=True)


